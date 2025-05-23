import { Readable } from "stream";
import { AssemblyAI } from "assemblyai";
import recorder from "node-record-lpcm16";


const run = async () => {
    const client = new AssemblyAI({
      apiKey: "d18dc491c9dd4c6d81dc760c5976273a",
    });
  };
  
  const transcriber = client.realtime.transcriber({
    sampleRate: 16_000,
  });
  
  transcriber.on("open", ({ sessionId }) => {
    console.log(`Session opened with ID: ${sessionId}`);
  });
  
  transcriber.on("error", (error) => {
    console.error("Error:", error);
  });
  
  transcriber.on("close", (code, reason) =>
    console.log("Session closed:", code, reason)
  );

  transcriber.on("transcript", (transcript) => {
    if (!transcript.text) {
      return;
    }
  
    if (transcript.message_type === "PartialTranscript") {
      console.log("Partial:", transcript.text);
    } else {
      console.log("Final:", transcript.text);
    }
  });
  
  transcriber.on("transcript", (transcript) => {
  if (!transcript.text) {
    return;
  }

  if (transcript.message_type === "PartialTranscript") {
    console.log("Partial:", transcript.text);
  } else {
    console.log("Final:", transcript.text);
  }
});

try {
    console.log("Connecting to real-time transcript service");
    await transcriber.connect();
  } catch (error) {
    console.error(error);
  }

  console.log("Starting recording");
const recording = recorder.record({
  channels: 1,
  sampleRate: 16_000,
  audioType: "wav", // Linear PCM
});

Readable.toWeb(recording.stream()).pipeTo(transcriber.stream());

process.on("SIGINT", async function () {
    console.log();
    console.log("Stopping recording");
    recording.stop();
  
    console.log("Closing real-time transcript connection");
    await transcriber.close();
  
    process.exit();
  });
  