import { RefObject, useEffect, useRef } from "react"


export function useAudioProcessor(audioRef: RefObject<HTMLMediaElement>) {
  const context = useRef(new AudioContext())
  const source = useRef<MediaElementAudioSourceNode>()
  const analyser = useRef<AnalyserNode>()
  // const buffer = useRef<AudioBuffer>();


  useEffect(() => {
    if (!audioRef.current) return

    audioRef.current.crossOrigin = "anonymous" // https://stackoverflow.com/questions/31308679/mediaelementaudiosource-outputs-zeros-due-to-cors-access-restrictions-local-mp3

    source.current = context.current.createMediaElementSource(audioRef.current)
    analyser.current = context.current.createAnalyser()

    source.current.connect(analyser.current)
    analyser.current.connect(context.current.destination)

    context.current.createBufferSource()

    // buffer.current = context.current.createBufferSource()

  }, [audioRef])

  const meanVolume = (dataArray: Uint8Array) => {
    const sum = dataArray.reduce((acc, value) => acc + value, 0)
    return sum / dataArray.length
  }

  const skipSilence = () => {

    let silenceStart = 0

    const analyze = () => {
      if (!analyser.current || !audioRef.current || ! source.current) return
  
      const bufferLength = analyser.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.current.getByteFrequencyData(dataArray)


      const volume = meanVolume(dataArray)

  
      if (volume < 10) {
        if (silenceStart === 0) {
          silenceStart = context.current.currentTime
        } 
        else if (context.current.currentTime - silenceStart > 1){
          console.log('SKIP SILENCE: ', context.current.currentTime, context.current.currentTime - silenceStart, source.current.mediaElement.currentTime)
          source.current.mediaElement.currentTime += 0.8
          silenceStart = context.current.currentTime - 0.2
        }
      } else {

        silenceStart = 0  
      }
  

      if (!audioRef.current.paused) {
        requestAnimationFrame(analyze) // loop
      }
    }
    console.log(audioRef.current?.src)
    analyze()
  }

  return { skipSilence }
}