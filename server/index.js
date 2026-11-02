import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app=express();
app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(v=>v.trim())||true}));
app.use(express.json({limit:'32kb'}));
const schema=new mongoose.Schema({
 state:{type:String,required:true,uppercase:true,minlength:2,maxlength:2},
 region:{type:String,required:true,trim:true,maxlength:120},
 bedrooms:{type:Number,required:true,min:0,max:30},bathrooms:{type:Number,required:true,min:0,max:30},
 sqft:{type:Number,required:true,min:100,max:100000},yearBuilt:{type:Number,required:true,min:1800,max:2100},
 lotSize:{type:Number,required:true,min:0,max:10000000},propertyType:{type:String,required:true},
 condition:{type:String,required:true},view:{type:String,required:true},predictedValue:{type:Number,required:true},modelVersion:{type:String,required:true}
},{timestamps:true});
const Prediction=mongoose.models.Prediction||mongoose.model('Prediction',schema);
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'zillow-api',modelConfigured:Boolean(process.env.MODEL_API_URL)}));
function validate(b){
 for(const k of ['state','region','propertyType','condition','view'])if(typeof b?.[k]!=='string'||!b[k].trim())return `${k} is required.`;
 if(!/^[A-Za-z]{2}$/.test(b.state))return 'state must be a two-letter US state code.';
 const ranges={bedrooms:[0,30],bathrooms:[0,30],sqft:[100,100000],yearBuilt:[1800,new Date().getFullYear()],lotSize:[0,10000000]};
 for(const [k,[min,max]] of Object.entries(ranges))if(!Number.isFinite(b[k])||b[k]<min||b[k]>max)return `${k} must be between ${min} and ${max}.`;
 return null;
}
app.post('/api/predictions',async(req,res)=>{
 const issue=validate(req.body);if(issue)return res.status(400).json({message:issue});
 if(!process.env.MODEL_API_URL)return res.status(503).json({message:'The original notebook model is not connected yet. Configure MODEL_API_URL after exporting and validating its fitted preprocessing + estimator pipeline.'});
 try{
  const response=await fetch(process.env.MODEL_API_URL,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.MODEL_API_TOKEN?{Authorization:`Bearer ${process.env.MODEL_API_TOKEN}`}:{})},body:JSON.stringify(req.body),signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)return res.status(502).json({message:data.detail||data.message||'Model inference failed.'});
  const predictedValue=Number(data.predictedValue);if(!Number.isFinite(predictedValue)||predictedValue<=0)return res.status(502).json({message:'Model returned an invalid value.'});
  let predictionId=null;
  if(process.env.MONGODB_URI){if(mongoose.connection.readyState===0)await mongoose.connect(process.env.MONGODB_URI);const saved=await Prediction.create({...req.body,predictedValue,modelVersion:String(data.modelVersion||'unknown')});predictionId=String(saved._id);}
  res.json({predictedValue,currency:data.currency||'USD',modelVersion:data.modelVersion||'unknown',predictionId});
 }catch(error){console.error(error);res.status(error.name==='TimeoutError'?504:502).json({message:'Could not reach the configured model service.'});}
});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({message:'Unexpected API error.'});});
if(!process.env.VERCEL)app.listen(process.env.PORT||5000,()=>console.log('Zillow API listening on port '+(process.env.PORT||5000)));
export default app;