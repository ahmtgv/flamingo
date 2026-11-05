// Adapter only: scoring and calibration are the unchanged Flamingo engine.
import { Внимание } from './cmf-engine.mjs';
import { числаКадра, качество, ПУСТОЙ_КАДР } from './cmf-numbers.mjs';

const required=['eyeBlinkLeft','eyeBlinkRight','jawOpen','eyeLookDownLeft','eyeLookDownRight',
  'eyeLookOutLeft','eyeLookInRight','eyeLookInLeft','eyeLookOutRight'];
export class AttentionSession {
  constructor(){this.engine=new Внимание();}
  update(result,timestamp,aspect,brightness){
    const points=result.faceLandmarks?.[0];
    if(!points?.length){
      this.engine.шаг({...ПУСТОЙ_КАДР,t:timestamp,экран:true},false);
      return {score:null,note:'Лицо не найдено'};
    }
    const matrix=result.facialTransformationMatrixes?.[0]?.data;
    const shapes=Object.fromEntries((result.faceBlendshapes?.[0]?.categories??[]).map(c=>[c.categoryName,c.score]));
    if(!matrix||matrix.length!==16||!Array.from(matrix).every(Number.isFinite)||
      required.some(k=>!Number.isFinite(shapes[k]))||brightness===null){
      // Missing signals must not silently become a perfect attention score.
      this.engine.сброс();
      return {score:null,note:'Недостаточно данных'};
    }
    const frame=числаКадра(points,k=>shapes[k]??0,matrix,aspect);
    if(!Number.isFinite(frame.веко)||!Number.isFinite(frame.рыск)||!Number.isFinite(frame.тангаж)){
      this.engine.сброс();
      return {score:null,note:'Недостаточно данных'};
    }
    const quality=качество(frame,brightness);
    const value=this.engine.шаг({...frame,t:timestamp,экран:true,качество:quality},false);
    if(quality!=='хорошо')return {score:null,note:({темно:'Добавь освещение',далеко:'Подойди ближе',обрезано:'Лицо целиком в кадре'})[quality]};
    const calibrated=this.engine.откуда!=='нет';
    return {score:value.балл,calibrated,currentState:value.сейчас,
      note:calibrated?'Личная норма настроена':`Настройка: ${Math.min(30,Math.floor(this.engine.собраноСек))} / 30 с · смотри в экран`};
  }
}
