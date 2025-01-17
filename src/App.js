import './App.css';
import React, {useEffect, useRef, useState} from 'react';

import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import {Howl, Howler} from 'howler'
import soundURL from './assets/nang_chen_tieu_sau.mp3'

var sound = new Howl({
  src: [soundURL]
})

const NOT_TOUCH_LABEL ='not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES =50;
const TOUCHED_CONFIDENCE =0.8;

function App() { 
  const video =useRef();
  const classifier =useRef();
  const canPlaySound = useRef(true)
  const mobilenetModule =useRef()

  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTouched, setIsTouched] = useState(false);

  const init = async() =>{
    await setupCamera()
    
    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log('setup done')
    console.log('Không đưa tay lên và bấm train 1')
    alert('setup camera success')
  }

  const setupCamera = () => {
    return new Promise((resolve, reject)=>{
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

      if (navigator.getUserMedia){
         navigator.getUserMedia(
          {video: true},
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
         )
      } else{
        reject()
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] Đang train...`)
    for (let i = 0 ; i<TRAINING_TIMES; ++i){
      console.log(`Progress ${parseInt((i+1)/TRAINING_TIMES * 100)}%`)
      setTrainingProgress(parseInt((i+1)/TRAINING_TIMES * 100));
      await training(label)
    }
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve()
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    
    if(result.label===TOUCHED_LABEL && result.confidences[result.label]>TOUCHED_CONFIDENCE){
      console.log("Touched");
      if (canPlaySound.current){
        canPlaySound.current=false
        sound.play()
      }
      setIsTouched(true);
    }
    else{
      console.log("Not touched")
      sound.pause()
      canPlaySound.current=true
      setIsTouched(false);
    }
    
    await sleep(200)
    run()
  }

  const sleep = (ms=0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(()=>{
    init();
    
    sound.on('end', function(){
      canPlaySound.current=true;
    });

    return()=>{
      
    }
  }, [])

  return (
    <div className='main'>
      <video 
        className="video"
        autoPlay
        ref = {video}
      />
      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}> Train 1 </button>
        <button className="btn" onClick={() => {train(TOUCHED_LABEL)}}> Train 2 </button>
        <button className="btn" onClick={() => {run()}}> Run </button>
      </div>
      <br></br>
      <h2>Hướng dẫn sử dụng: Không giơ tay và ấn train 1 đợi Training Progress hoàn thành, sau đó giơ tay và ấn train 2 đợi Training Progress hoàn thành, sau đó Run</h2>
      <div className="overlay">
        <p>Training Progress: {trainingProgress}%</p>
        <p>Status: {isTouched ? "Touched" : "Not touched"}</p>
      </div>
    </div>
  );
}

export default App;
