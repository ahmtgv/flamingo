/* Local-only inference. Frames are transferred into this worker and closed;
 * neither frames nor landmarks are stored or sent over a network. */
let model;
let attention;
let lightCanvas,lightContext,lastLight=-Infinity,brightness=null;
// Keep model telemetry and all other external requests off this local-only demo.
const localFetch=self.fetch.bind(self);
self.fetch=(input,options)=>{
  const url=new URL(typeof input==='string'?input:input.url??input.href,self.location.href);
  if(url.origin!==self.location.origin)return Promise.reject(new Error('External requests disabled'));
  return localFetch(input,options);
};
let busy=false;
const eyelids=[[33,160,158,133,153,144],[362,385,387,263,373,380]];
function ear(points,ids,aspect){
  const p=ids.map(i=>points[i]);
  if(p.some(x=>!x))return null;
  const dist=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);
  const horizontal=dist(p[0],p[3]);
  return horizontal>0?(dist(p[1],p[5])+dist(p[2],p[4]))/(2*horizontal):null;
}
self.onmessage=async({data})=>{
  if(data.type==='init'){
    try{
      const {FaceLandmarker,FilesetResolver}=await import('./assets/vision/vision_bundle.mjs');
      const {AttentionSession}=await import('./cmf-attention.mjs');
      attention=new AttentionSession();
      lightCanvas=new OffscreenCanvas(32,24);
      lightContext=lightCanvas.getContext('2d',{willReadFrequently:true});
      const files=await FilesetResolver.forVisionTasks(new URL('./assets/vision/wasm',self.location.href).href);
      model=await FaceLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:new URL('./assets/vision/face_landmarker.task',self.location.href).href,delegate:'CPU'},
        runningMode:'VIDEO',numFaces:1,outputFacialTransformationMatrixes:true,outputFaceBlendshapes:true
      });
      self.postMessage({type:'ready',mesh:FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        eyes:[...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE]});
    }catch(error){self.postMessage({type:'error',message:'Не удалось загрузить локальную модель лица.'});}
    return;
  }
  if(data.type!=='frame')return;
  const bitmap=data.bitmap;
  if(!model||busy){bitmap?.close();self.postMessage({type:'skipped'});return;}
  busy=true;
  try{
    const result=model.detectForVideo(bitmap,data.timestamp);
    if(data.timestamp-lastLight>=1000&&lightContext){
      lightContext.drawImage(bitmap,0,0,32,24);
      const pixels=lightContext.getImageData(0,0,32,24).data;
      let sum=0;
      for(let i=0;i<pixels.length;i+=4)sum+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
      brightness=sum/(pixels.length/4)/255;lastLight=data.timestamp;
    }
    const index=attention.update(result,data.timestamp,bitmap.width/bitmap.height,brightness);
    const points=result.faceLandmarks?.[0];
    if(!points?.length){self.postMessage({type:'result',found:false,index});return;}
    // Same EAR and column-major matrix conventions as Flamingo sedum/числа.ts.
    const ears=eyelids.map(ids=>ear(points,ids,bitmap.width/bitmap.height)).filter(x=>x!==null);
    const m=result.facialTransformationMatrixes?.[0]?.data;
    const valid=m?.length===16&&Array.from(m).every(Number.isFinite);
    const yaw=valid?Math.atan2(m[8],m[10])*180/Math.PI:null;
    const pitch=valid?Math.asin(Math.max(-1,Math.min(1,-m[9])))*180/Math.PI:null;
    const xy=new Float32Array(points.length*2);
    points.forEach((p,i)=>{xy[i*2]=p.x;xy[i*2+1]=p.y;});
    self.postMessage({type:'result',found:true,points:xy,ear:ears.length?Math.max(...ears):null,yaw,pitch,index},[xy.buffer]);
  }catch(error){self.postMessage({type:'error',message:'Не удалось обработать кадр. Камера остановлена.'});}
  finally{bitmap.close();busy=false;}
};
