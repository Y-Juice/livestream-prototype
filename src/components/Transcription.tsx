import React, { useEffect, useState } from 'react';

interface TranscriptionProps {
  isActive: boolean;
}

// Check if browser supports speech recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

const Transcription: React.FC<TranscriptionProps> = ({ isActive }) => {
  const [transcription, setTranscription] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  useEffect(() => {
    if (!isActive) return;
    
    // Check if browser supports speech recognition
    if (!hasSpeechRecognition) {
      setError("Your browser doesn't support speech recognition. Try Chrome or Edge.");
      return;
    }
    
    setError("");
    let recognition: any = null;
    
    const startTranscription = async () => {
      try {
        // Initialize speech recognition
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Start recording
        setIsRecording(true);
        
        // Handle results
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            console.log("Final:", finalTranscript);
            setTranscription(prev => prev + finalTranscript);
          }
          
          console.log("Interim:", interimTranscript);
        };
        
        // Handle errors
        recognition.onerror = (event: any) => {
          console.error("Recognition error:", event.error);
          setError(`Recognition error: ${event.error}`);
          
          if (event.error === 'not-allowed') {
            setError("Microphone access denied. Please allow microphone access.");
          }
        };
        
        // Handle end of recognition - restart it to keep it continuous
        recognition.onend = () => {
          if (isActive && isRecording) {
            console.log("Recognition ended, restarting...");
            recognition.start();
          }
        };
        
        // Start recognition
        recognition.start();
        console.log("Speech recognition started");
        
      } catch (error: any) {
        console.error("Transcription error:", error);
        setIsRecording(false);
        setError(`Transcription error: ${error.message || "Unknown error"}`);
      }
    };
    
    startTranscription();
    
    // Cleanup function
    return () => {
      if (recognition) {
        console.log("Stopping speech recognition");
        setIsRecording(false);
        try {
          recognition.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
      }
    };
  }, [isActive]);
  
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Live Transcription</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <div className="bg-gray-100 p-3 rounded min-h-[100px]">
        {transcription || "Transcription will appear here..."}
      </div>
      {isRecording && (
        <div className="mt-2 text-green-500 flex items-center">
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
          Recording...
        </div>
      )}
      {!hasSpeechRecognition && (
        <div className="mt-2 text-orange-500">
          Note: This feature requires a browser that supports the Web Speech API (Chrome or Edge recommended).
        </div>
      )}
    </div>
  );
};

export default Transcription;
  