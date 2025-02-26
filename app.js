// DOM Elements
const keySelect = document.getElementById("keySelect");
const scaleSelect = document.getElementById("scaleSelect");
const sequenceLengthInput = document.getElementById("sequenceLength");
const tempoSelect = document.getElementById("tempoSelect");
const generateButton = document.getElementById("generateSequence");
const playButton = document.getElementById("playSequence");
const replayButton = document.getElementById("replaySequence");
const submitButton = document.getElementById("submitSequence");
const clearButton = document.getElementById("clearSequence");
const notationContainer = document.getElementById("notation-container");
const userNotationContainer = document.getElementById("user-notation-container");
const userNoteButtons = document.getElementById("userNoteButtons");
const feedbackElement = document.getElementById("feedback");
const scoreElement = document.getElementById("score");

// App State
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const preferredKeyNames = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb"
};
const enharmonicMap = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
  "E#": "F",
  "B#": "C",
  "Fb": "E",
  "Cb": "B"
};
let generatedSequence = [];
let userSequence = [];
let currentKey = "C";
let currentScale = "major";
let isPlaying = false;
let score = 0;
let synth = null;
const defaultOctave = 4; // Fixed octave for both playback and notation

// Initialize Tone.js synth
function initSynth() {
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.5 }
    }).toDestination();
  }
}

// Initialize the app
function initApp() {
  populateKeys();
  updateUserButtons();
  setupEventListeners();
}

// Populate key dropdown with proper naming
function populateKeys() {
  keySelect.innerHTML = "";
  noteNames.forEach(note => {
    const option = document.createElement("option");
    option.value = note;
    option.textContent = preferredKeyNames[note] || note;
    keySelect.appendChild(option);
  });
  keySelect.value = "C";
}

// Set up event listeners
function setupEventListeners() {
  generateButton.addEventListener("click", async () => {
    if (Tone.context.state !== "running") {
      await Tone.start();
    }
    initSynth();
    generateNewSequence();
  });

  playButton.addEventListener("click", () => playGeneratedSequence());
  replayButton.addEventListener("click", () => playGeneratedSequence());

  submitButton.addEventListener("click", () => {
    const correct = checkSequence();
    updateFeedback(correct);
    if (correct) {
      // Reveal the full sequence if correct
      renderNotation(generatedSequence, "notation-container");
    }
  });

  clearButton.addEventListener("click", () => {
    userSequence = [];
    renderNotation([], "user-notation-container");
    feedbackElement.textContent = "";
  });

  keySelect.addEventListener("change", () => {
    currentKey = keySelect.value;
    updateUserButtons();
  });

  scaleSelect.addEventListener("change", () => {
    currentScale = scaleSelect.value;
    updateUserButtons();
  });
}

// Scale definitions
const scales = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10]
};

// Get scale notes with proper enharmonic representation
function getScaleNotes(key, scale) {
  const keyIndex = noteNames.indexOf(key);
  const scaleIntervals = scales[scale];
  let scaleNotes = scaleIntervals.map(interval => noteNames[(keyIndex + interval) % 12]);

  const useFlats = shouldUseFlats(key);
  return scaleNotes.map(note => getEnharmonicEquivalent(note, useFlats));
}

// Determine if flats should be used for this key
function shouldUseFlats(key) {
  const flatKeys = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
  return flatKeys.includes(key) || flatKeys.includes(preferredKeyNames[key]);
}

// Get the appropriate enharmonic equivalent
function getEnharmonicEquivalent(note, useFlats) {
  return useFlats ? enharmonicMap[note] || note : note;
}

// Generate a new sequence
function generateNewSequence() {
  currentKey = keySelect.value;
  currentScale = scaleSelect.value;
  const length = parseInt(sequenceLengthInput.value);
  const scaleNotes = getScaleNotes(currentKey, currentScale);
  generatedSequence = [];
  for (let i = 0; i < length; i++) {
    const randomNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
    generatedSequence.push(randomNote);
  }

  // As per original design, render only the first note initially
  renderNotation([generatedSequence[0]], "notation-container");
  userSequence = [];
  renderNotation([], "user-notation-container");
  feedbackElement.textContent = "";

  playButton.disabled = false;
  replayButton.disabled = false;
  submitButton.disabled = true;
  clearButton.disabled = true;

  // Auto-play the sequence after a short delay
  setTimeout(playGeneratedSequence, 500);
}

// Parse a note into its base and accidental parts
function parseNote(note) {
  let baseName, accidental;
  if (note.length > 1) {
    baseName = note.charAt(0).toUpperCase();
    accidental = note.substring(1);
  } else {
    baseName = note.toUpperCase();
    accidental = "";
  }
  return { baseName, accidental };
}

// Convert accidental to proper VexFlow format
function convertAccidental(accidental) {
  if (accidental === "#") return "#";
  if (accidental === "b") return "b";
  if (accidental === "##") return "##";
  if (accidental === "bb") return "bb";
  return "";
}

// Get tempo value in milliseconds
function getTempoValue() {
  const tempos = { slow: 1000, medium: 600, fast: 350 };
  return tempos[tempoSelect.value] || 600;
}

// Play a single note (with fixed octave)
function playNote(note, duration) {
  try {
    if (!synth) {
      initSynth();
    }
    const { baseName, accidental } = parseNote(note);
    const fullNote = baseName + accidental + defaultOctave;
    synth.triggerAttackRelease(fullNote, duration / 1000);
  } catch (error) {
    console.error("Error playing note:", error);
  }
}

// Play the generated sequence
function playGeneratedSequence() {
  if (generatedSequence.length === 0) return;
  if (isPlaying) return;
  
  isPlaying = true;
  playButton.disabled = true;
  replayButton.disabled = true;
  const tempoMs = getTempoValue();

  generatedSequence.forEach((note, index) => {
    setTimeout(() => {
      playNote(note, tempoMs * 0.8);
      if (index === generatedSequence.length - 1) {
        setTimeout(() => {
          isPlaying = false;
          playButton.disabled = false;
          replayButton.disabled = false;
        }, tempoMs);
      }
    }, index * tempoMs);
  });
}

// Render notation using VexFlow (with corrected accidental handling)
function renderNotation(sequence, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (sequence.length === 0) return;

  try {
    const VF = Vex.Flow;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(400, 150);
    const context = renderer.getContext();
    context.setFont("Arial", 10);

    const stave = new VF.Stave(10, 40, 380);
    stave.addClef("treble").setContext(context).draw();

    const vexNotes = sequence.map(note => {
      const { baseName, accidental } = parseNote(note);
      const vfAccidental = convertAccidental(accidental);
      // Use lowercase for VexFlow key strings (e.g., "c/4")
      const keyStr = baseName.toLowerCase() + "/" + defaultOctave;
      const staveNote = new VF.StaveNote({
        keys: [keyStr],
        duration: "q"
      });
      // Corrected: add accidental using addAccidental (with index 0)
      if (vfAccidental) {
        staveNote.addAccidental(0, new VF.Accidental(vfAccidental));
      }
      return staveNote;
    });

    const voice = new VF.Voice({ num_beats: sequence.length, beat_value: 4 });
    voice.addTickables(vexNotes);

    new VF.Formatter().joinVoices([voice]).format([voice], 350);
    voice.draw(context, stave);
  } catch (error) {
    console.error("Error rendering notation:", error);
    console.error("Sequence that caused error:", sequence);
  }
}

// Update the user note buttons based on current key and scale
function updateUserButtons() {
  userNoteButtons.innerHTML = "";
  const scaleNotes = getScaleNotes(currentKey, currentScale);
  scaleNotes.forEach(note => {
    const button = document.createElement("button");
    button.className = "note-button";
    button.textContent = note;
    button.addEventListener("click", async () => {
      if (Tone.context.state !== "running") {
        await Tone.start();
      }
      initSynth();
      userSequence.push(note);
      renderNotation(userSequence, "user-notation-container");
      playNote(note, 300);
      submitButton.disabled = false;
      clearButton.disabled = false;
    });
    userNoteButtons.appendChild(button);
  });
}

// Check if the user's sequence matches the generated sequence
function checkSequence() {
  if (userSequence.length !== generatedSequence.length) return false;
  for (let i = 0; i < generatedSequence.length; i++) {
    if (userSequence[i] !== generatedSequence[i]) return false;
  }
  return true;
}

// Update feedback and score
function updateFeedback(isCorrect) {
  feedbackElement.textContent = isCorrect ? "Correct! 🎉" : "Try Again! 🔄";
  feedbackElement.className = "feedback " + (isCorrect ? "correct" : "incorrect");
  if (isCorrect) {
    score += 10;
    scoreElement.textContent = `Score: ${score}`;
  }
}

// Initialize the app when the DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
