// ─── GLOBAL VARIABLES ──────────────────────────────────────────────

const cooldownTime = 2000; // 2 seconds
const fadeTime = "0.19";
let selectedVoice = "echo";
let activeInput = 1;
let outputBox = 2;
let currentBox = null;

const defaultFlagUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Flag_of_the_United_Nations.svg'; // United Nations flag as default

const langVoices = {
  french: "onyx",
  thai: "echo",
  hindi: "onyx",
  arabic: "onyx",
  mandarin: "shimmer",
  american: "alloy",
  english: "alloy",
  italian: "nova",
  patois: "shimmer",
};

const easyTranslates = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese", "Japanese",
  "Korean", "Arabic", "Hindi", "Bengali", "Urdu", "Turkish", "Persian", "Polish", "Swedish", "Norwegian",
  "Danish", "Finnish", "Greek", "Hungarian", "Czech", "Slovak", "Ukrainian", "Romanian", "Bulgarian", "Serbian",
  "Croatian", "Slovenian", "Hebrew", "Indonesian", "Malay", "Thai", "Vietnamese", "Filipino", "Swahili", "Zulu",
  "Xhosa", "Amharic", "Tamil", "Telugu", "Kannada", "Marathi", "Gujarati", "Punjabi", "Sinhala", "Burmese",
  "Parisian French"
];

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

function placeCaretAtEnd(el) {
  el.focus();
  if (window.getSelection && document.createRange) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function adjustFontSizeOfInputs() {
  document.querySelectorAll(".text-input").forEach(input => {
    const len = input.textContent.trim().length;
    const size = Math.max(Math.round(-0.06 * len + 20.06), 15);
    input.style.fontSize = size + "px";
  });
  checkCharCount();
}

const maxchars = 500;
function checkCharCount() {
  const charLimit = document.getElementById(`char-limit${activeInput}`);
  const input = document.getElementById(`text-input${activeInput}`);
  let text = input.textContent.trim();
  if (text.length > maxchars) {
    input.textContent = text.substring(0, maxchars);
    text = input.textContent.trim();
    placeCaretAtEnd(input);
  }
  charLimit.innerHTML = text.length >= maxchars * 0.9 ? `${text.length} / ${maxchars}` : "";
  charLimit.style.opacity = text.length >= maxchars * 0.9 ? '0.3' : '0';
}

function clearCharCount(num) {
  const charLimit = document.getElementById(`char-limit${num}`);
  fadeOut(charLimit, false);
}

function clearAudio() {
  const audioPlayer = document.getElementById("audioPlayer");
  const playButton = document.getElementById("playButton");
  audioPlayer.pause();
  audioPlayer.src = "";
  audioPlayer.load();
  playButton.style.opacity = 0.3;
  playButton.style.cursor = "default";
}

// ─── FADE FUNCTIONS ───────────────────────────────────────────────

function fadeOut(element, remove = true, s = fadeTime) {
  if (element) {
    element.style.transition = `opacity ${s}s ease`;
    element.style.opacity = '0';
    if (remove) {
      element.addEventListener('transitionend', () => element.remove(), { once: true });
    }
  }
}

function fadeIn(element, display = 'block', s = fadeTime) {
  element.style.opacity = '0';
  element.style.display = display;
  element.getBoundingClientRect(); // force reflow
  element.style.transition = `opacity ${s}s ease`;
  setTimeout(() => element.style.opacity = '1', 10);
}

function fadeSwitch(oldEl, newEl) {
  fadeOut(oldEl, false);
  oldEl.addEventListener('transitionend', () => {
    oldEl.replaceWith(newEl);
    fadeIn(newEl);
  }, { once: true });
}

function fadeOutAll(className, s = fadeTime) {
  document.querySelectorAll(`.${className}`).forEach(el => {
    el.style.transition = `opacity ${s}s ease`;
    el.style.opacity = '0';
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  });
}

function fadeInAll(className, s = fadeTime) {
  document.querySelectorAll(`.${className}`).forEach(el => {
    el.style.display = 'block';
    el.style.transition = `opacity ${s}s ease`;
    setTimeout(() => el.style.opacity = '1', 10);
  });
}

function clearMoreInfo() {
  fadeOutAll("more-info-title");
  fadeOutAll("more-info-button");
  fadeOutAll("info-section");
}

// ─── API FUNCTIONS ───────────────────────────────────────────────

async function chatgptRequest(model, system, prompt) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  try {
    const response = await fetch("https://api-5ol644xcrq-uc.a.run.app/getChatGPTResponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
    });
    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Error calling ChatGPT API:", error);
    return "An error occurred.";
  }
}

async function getFlagUrl(countryName) {
  if (!countryName) return null;
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=File:Flag_of_${encodeURIComponent(countryName)}.svg&prop=imageinfo&iiprop=url`;
  
  try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      const pages = data.query.pages;
      const page = Object.values(pages)[0];

      return page.imageinfo ? page.imageinfo[0].url : getFlagFallback(countryName);
  } catch (error) {
      console.error("Error fetching flag:", error);
      return getFlagFallback(countryName);
  }
}

// Fallback Function: Getting Flag
async function getFlagFallback(countryName) {
  const searchMax = 50; // Max items to search
  const searchTerms = [
    `flag of ${countryName}.svg`,
    `flag of the ${countryName}.svg`,
    `flag of ${countryName} (1-2).svg`,
    `flag of the ${countryName} (1-2).svg`,
  ];
  let bestMatch = null;
  const possibilities = [];
  try {
    let offset = 0;
    // Search loop
    while (!bestMatch && offset <= searchMax) {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(
        searchTerms[0]
      )}&srnamespace=6&srlimit=10&sroffset=${offset}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const results = data?.query?.search || [];
      // Iterate through search results
      for (const result of results) {
        const title = result.title.toLowerCase().replace(/^file:/, '');
        // Check for possible matches
        if (
          title.endsWith('.svg') &&
          title.includes('flag of') &&
          title.includes(countryName.toLowerCase()) &&
          !/\d/.test(title) && // Exclude numbers
          !/[()]/.test(title)   // Exclude brackets
        ) {
          possibilities.push(result);
        }
        // Check if the title is an exact match
        if (searchTerms.some(term => term.toLowerCase() === title)) {
          bestMatch = result;
          break; // Exit loop immediately on finding the best match
        }
      }
      if (bestMatch || results.length < 10) break; // Stop if a match is found or no more results
      offset += 10;
    }
    // If no perfect match, choose the first possibility
    if (!bestMatch && possibilities.length) bestMatch = possibilities[0];
    // Fetch and return the flag URL
    if (bestMatch) {
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&pageids=${bestMatch.pageid}&iiprop=url`;
      const imageInfoData = await (await fetch(imageInfoUrl)).json();
      const imageUrl = imageInfoData?.query?.pages?.[bestMatch.pageid]?.imageinfo?.[0]?.url; 
      console.log(imageUrl);
      if (imageUrl) return imageUrl;
    }
    return null;
  } catch (error) {
    console.error('Error fetching flag SVG:', error);
    return null;
  }
}


// ─── DOM / LANGUAGE INFO FUNCTIONS ───────────────────────────────

async function moreInfo(text, language, pronounceBox) {
  fadeOutAll("more-info-button");
  const prompt = `“${text}”. The user knows the meaning of this phrase and how to pronounce from AI. Provide a few bullet points about this; variants, its literal meaning, and common responses. Use gender differences and pronunciation tips sparingly when relevant. Put quotes around ${language} phrases, and keep responses under 70 words.`;
  const botMessage = await chatgptRequest("gpt-3.5-turbo", "", prompt);
  const wrapper = document.querySelector('.wrapper');
  wrapper.insertAdjacentHTML('beforeend', `
    <div class="more-info-title">
      <div class="line"></div>
      <h2>MORE INFO</h2>
      <div class="line"></div>
    </div>
  `);
  const title = wrapper.querySelector('.more-info-title');
  fadeIn(title, "flex");
  await sleep(0.5);
  
  const infoSection = document.createElement('div');
  infoSection.className = 'info-section';
  const infoItems = botMessage.split(/-\s+/).filter(item => item.trim());
  const excludeStrings = ["no gender", "none"];
  const notPronounceBox = pronounceBox === 1 ? 2 : 1;
  const englishText = document.getElementById(`text-input${notPronounceBox}`).innerHTML;
  
  infoItems.forEach(item => {
    if (excludeStrings.some(str => item.toLowerCase().includes(str))) return;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'info-item';
    const [header, ...contentArr] = item.split(':');
    const content = contentArr.join(':').trim();
    const headerWords = header.trim().split(/\s+/);
    if (headerWords.length <= 2) {
      const h2 = document.createElement('h2');
      h2.className = 'header';
      h2.textContent = header.trim();
      itemDiv.appendChild(h2);
    } else {
      const p = document.createElement('p');
      p.textContent = header.trim();
      itemDiv.appendChild(p);
    }
    if (header.trim().toLowerCase().includes("literal") && content.toLowerCase().includes(englishText.toLowerCase())) return;
    
    let processedContent = content;
    if (/variant/i.test(header) || /response/i.test(header) || /variant/i.test(content) || /response/i.test(content)) {
      processedContent = content.replace(/"([^"]+)"/g, '<span class="clickable-phrase">$1</span>')
                                .replace(/(\b[\w]*[^\x00-\x7F]+[\w]*\b)/gu, '<span class="clickable-phrase">$1</span>');
    }
    const contentEl = document.createElement('p');
    contentEl.innerHTML = processedContent;
    itemDiv.appendChild(contentEl);
    infoSection.appendChild(itemDiv);
    itemDiv.querySelectorAll('.clickable-phrase').forEach(phrase => {
      phrase.addEventListener('click', event => {
        const txt = event.target.textContent;
        document.getElementById(`text-input${pronounceBox}`).innerHTML = txt;
        clearOtherInput(pronounceBox);
        translateText();
      });
    });
  });
  wrapper.appendChild(infoSection);
  fadeIn(infoSection);
}

function getLanguage(box) {
  return document.querySelector(`.input${box} .language-label`).textContent;
}

// ─── INPUT / CLEAR FUNCTIONS ─────────────────────────────────────

function clearOtherInput(inputNumber) {
  const other = inputNumber === 1 ? 2 : 1;
  document.getElementById(`text-input${other}`).innerHTML = "";
  clearCharCount(other);
  clearMoreInfo();
  clearPronounce();
  clearAudio();
  adjustFontSizeOfInputs();
}

function clearPronounce() {
  document.querySelectorAll('.pronunciation-box').forEach(box => {
    box.style.opacity = '0';
    box.style.height = '0px';
    setTimeout(() => box.remove(), 200);
  });
}

function addPronounceBox(pronounce, pronounceBox) {
  const newBox = document.createElement("div");
  newBox.className = "pronunciation-text";
  newBox.textContent = pronounce;
  newBox.style.opacity = "0.4";
  
  const container = document.querySelector(`.input-container.input${pronounceBox}`);
  clearPronounce();
  const pronunciationBox = document.createElement("div");
  pronunciationBox.className = "pronunciation-box";
  pronunciationBox.style.height = '0px';
  pronunciationBox.appendChild(newBox);
  
  const charLimitEl = document.getElementById(`char-limit${pronounceBox}`);
  container.insertBefore(pronunciationBox, charLimitEl);
  setTimeout(() => {
    pronunciationBox.style.height = newBox.scrollHeight + 'px';
    pronunciationBox.style.opacity = '1';
  }, 10);
}

function handleClick(event, inputNumber) {
  if (event.target.classList.contains("recordButton") || event.target.id === "playButton") return;
  setActiveInput(inputNumber);
  document.querySelector(`#text-input${inputNumber}`).focus();
}

function setActiveInput(inputNumber) {
  activeInput = inputNumber;
  outputBox = inputNumber === 1 ? 2 : 1;
}

function clearPlaceholder(element) {
  if (element.textContent.trim() === element.getAttribute("data-placeholder")) {
    element.textContent = "";
  }
}

// ─── LANGUAGE SELECTION & TRANSLATION ─────────────────────────────

async function selectLanguage(detected = null) {
  closeLangGrid();
  const inputField = document.querySelector('.langchoice-input input[type="text"]');
  let userInput = detected ?? inputField.value;
  
  let botMessage = localStorage.getItem(`langOrDialect_${userInput.toLowerCase()}`);
  if (botMessage) {
    console.log(`Retrieved from storage: ${botMessage}`);
  } else {
    botMessage = (await chatgptRequest(
      "gpt-3.5-turbo",
      "Give 1 word response: language, dialect, place, or none (if no language can be linked to this)",
      `${userInput}: language, dialect or place?`
    )).toLowerCase();
    localStorage.setItem(`langOrDialect_${userInput.toLowerCase()}`, botMessage);
    console.log(botMessage);
  }
  
  if (botMessage.includes("dialect") || botMessage.includes("language")) {
    closeOverlay();
    const response = await chatgptRequest(
      "gpt-3.5-turbo",
      "Strictly follow the format: Language: {dialect}, Country: {country_name}, don't add anything",
      `Language: ${userInput}; identify country most associated with this language`
    );
    botMessage = response;
    const language = botMessage.match(/Language:\s*([^,]*)/)[1].trim();
    const country_name = botMessage.match(/Country:\s*([^,]*)/)[1].trim();
    confirmLanguage(language, country_name);
  } else if (botMessage.includes("place")) {
    botMessage = await chatgptRequest(
      "gpt-3.5-turbo",
      "Strictly follow the format, and don't give any other information: Dialects: language1 (%),language2 (%),etc..",
      `Provide the top dialects spoken in ${userInput}. If one main dialect is spoken across in this place, just provide that one. If multiple dialects spoken, provide a maximum of 6, with a percentage estimate for how useful it would be to know this language when visiting.`
    );
    const languagesMatch = botMessage.match(/Dialects:\s*([^]+?)(?:\n\n|$)/);
    const languagesString = languagesMatch?.[1]?.trim() ?? botMessage.trim();
    let language_list = languagesString.split(",").map(lang => lang.trim()).filter(item => !item.toLowerCase().includes("language"));
    const itemWith100 = language_list.find(item => item.includes("100%"));
    if (itemWith100) language_list = [itemWith100];
    
    if (language_list.length > 1) {
      const langChoiceInput = document.querySelector(".langchoice-input");
      const gridDiv = document.createElement("div");
      gridDiv.classList.add("language-grid");
      language_list.forEach(language => {
        const div = document.createElement("div");
        div.classList.add("language-grid-item");
        div.textContent = language;
        div.onclick = async () => { confirmLanguage(language.split("(")[0].trim(), ""); };
        gridDiv.appendChild(div);
      });
      langChoiceInput.insertAdjacentElement("afterend", gridDiv);
      const langChoiceOptions = document.querySelector(".langchoice-options");
      setTimeout(() => {
        gridDiv.style.height = gridDiv.scrollHeight + 'px';
        gridDiv.style.opacity = '1';
        langChoiceOptions.style.maxHeight = '50%';
      }, 10);
      botMessage = await chatgptRequest(
        "gpt-3.5-turbo",
        "Strictly follow the format: Country: {country_name}",
        `Give ${userInput}'s country. If unable, give country most associated with ${languagesString}`
      );
      const country_name = botMessage.split(':').pop().trim();
    } else {
      closeOverlay();
      const language = language_list[0].split("(")[0].trim();
      botMessage = await chatgptRequest(
        "gpt-3.5-turbo",
        "Strictly follow the format: Country: {country_name}",
        `Give ${userInput}'s country. If unable, give country most associated with ${languagesString}`
      );
      const country_name = botMessage.split(':').pop().trim();
      confirmLanguage(language, country_name);
    }
  } else {
    errorShake(document.querySelector(".confirm-arrow"));
  }
}

function errorShake(icon) {
  if (!document.querySelector('#shake-style')) {
    const style = document.createElement('style');
    style.id = 'shake-style';
    style.textContent = `
      @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-10px); } 40%, 80% { transform: translateX(10px); } }
      .shake { animation: shake 0.3s ease; }
    `;
    document.head.appendChild(style);
  }
  icon.classList.add('shake');
  icon.addEventListener('animationend', () => icon.classList.remove('shake'), { once: true });
}

async function confirmLanguage(language, flag) {
  closeOverlay();

  // Remove specific words
  ["standard", "general", "modern"].forEach(word => {
      language = language.replace(new RegExp(word, "gi"), "").trim();
  });
  // Extract language from output
  language = language.includes(":") ? language.split(":")[1].trim() : language;

  // Current language box
  const box = document.getElementById(currentBox);
  const boxText = box.querySelector(".box-text");
  const currentBoxId = currentBox.replace("box", "");
  const flagImg = box.querySelector(".flag img");
  // Fade out flag
  fadeOut(flagImg, false);

  // Smooth new width
  // const initialWidth = box.getBoundingClientRect().width;
  // box.style.transition = "width 0.84s ease";
  // box.style.width = `${initialWidth}px`;
  // box.getBoundingClientRect(); // Force reflow
  // const tempSpan = document.createElement("span");
  // tempSpan.style.visibility = "hidden";
  // tempSpan.style.whiteSpace = "nowrap";
  // tempSpan.innerText = language;
  // document.body.appendChild(tempSpan);
  // const newWidth = tempSpan.getBoundingClientRect().width + 40;
  // document.body.removeChild(tempSpan);
  // // Animate width change
  // requestAnimationFrame(() => {
  //     box.style.width = `${newWidth}px`;
  //     setTimeout(() => {
  //         boxText.innerText = language;
  //         fadeIn(boxText, "block", 0.3);
  //     }, 150);
  // });
   
  boxText.innerText = language;


  // Fade out placeholder
  const placeholderText = document.querySelector(`.input-container.input${currentBoxId} .text-input`);
  fadeOut(placeholderText, false);

  // 'Enter Text' Translation
  const translationPromise = chatgptRequest(
      "gpt-3.5-turbo",
      "Strictly follow the format: Translation: {translation}",
      `Translate into ${language}: Enter text to translate`
  );
  clearOtherInput(activeInput);

  // Update language label text
  const languageLabel = document.querySelector(`.input-container.input${currentBoxId} .language-label`);
  languageLabel.innerText = language;

  // Resolve flag URL if necessary
  const flagPromise = (flag.includes("http") || flag.includes(".svg"))
      ? Promise.resolve(flag)
      : getFlagUrl(flag);

  // Keyboard characters
  const keyCharsListPromise = chatgptRequest(
    "gpt-3.5-turbo",
    "Return a comma-separated list only, nothing else",
    `Provide characters in ${language} not on a standard English keyboard.`
  );
  keyCharsListPromise.then(keyChars => {
    const container = document.querySelector(`.input-container.input${currentBoxId}`);
    if (!container) return;
    const grid = document.createElement("div");
    grid.classList.add("char-grid");
    container.after(grid);
    keyChars.split(',').forEach(char => {
        if (char.trim()) {
            const item = document.createElement("div");
            item.classList.add("char-item");
            item.textContent = char;
            grid.appendChild(item);
        }
    });
  });
  
  try {
    // Wait for 'Enter Text' and flag to load simultaneously
    const [botMessage, flagSrc] = await Promise.all([translationPromise, flagPromise]);
    await sleep(0.5);
    // Extract translated text
    const translationMatch = botMessage.match(/Translation:\s*(.*)/);
    if (translationMatch) {
      const translation = translationMatch[1] + "..";
      // Fade in placeholder text
      placeholderText.setAttribute("data-placeholder", translation);
      fadeIn(placeholderText);
    } else {
      console.error("Placeholder translation not found.");
    }
    // Fade in new flag
    flagImg.src = flagSrc;
    fadeIn(flagImg, "block", 0.32);
  } catch (error) {
    console.error('Error updating placeholder or flag:', error);
  }
}

async function translateText() {
  const activeInputBox = document.getElementById(`text-input${activeInput}`)?.textContent || '';
  const outputContent = document.getElementById(`text-input${outputBox}`)?.textContent || '';
  if (!activeInputBox && outputContent) setActiveInput(outputBox);
  
  const translateFrom = document.querySelector(`.input${activeInput} .language-label`).textContent;
  const translateTo = document.querySelector(`.input${outputBox} .language-label`).textContent;
  const text = document.getElementById(`text-input${activeInput}`).textContent;
  const outputElement = document.getElementById(`text-input${outputBox}`);
  
  outputElement.innerHTML = '<div class="loader-wrapper"><div class="pulsing-circle"></div></div>';
  fadeIn(outputElement.firstChild);
  
  let model = "gpt-3.5-turbo";
  if (easyTranslates.includes(translateTo) && text.length < 20) {
    model = "gpt-3.5-turbo";
  } else if (text.length < 201) {
    model = "gpt-4";
  }
  const addPronounce = text.length <= 60;
  if (!text.trim()) return;
  
  let translateprompt_system = "You are a highly accurate translator, rendering phrases just as a local would say them, capturing specific cultural nuances. Respond strictly in this format: Translation: {translation}";
  if (translateFrom === "Detect Language") translateprompt_system += " Detected: {detected_language}";
  
  const paragraphs = text.split(/\n+/);
  const translationPromises = paragraphs.map(async paragraph => {
    const sentences = paragraph.match(/[^.!?]+[.!?]*\s*/g) || [paragraph];
    const sentencePromises = sentences.map(async s => {
      const translateprompt_user = `Output the ${translateTo} equivalent of '${s.trim()}' (${translateFrom}). If you can't translate, return the user input as the translation.`;
      const botMessage = await chatgptRequest(model, translateprompt_system, translateprompt_user);
      let translation = botMessage.split("Translation:")[1].trim().replace("$[]$", "");
      if (translateFrom === "Detect Language") {
        const parts = translation.split("Detected:");
        translation = parts[0];
        selectLanguage(parts[1]);
      }
      const translitMatch = botMessage.match(/\$\[(.*?)\]\$/);
      if (translitMatch && translitMatch[1]) {
        translation = translation.split("$[")[0].trim();
      }
      return translation + " ";
    });
    const translatedSentences = await Promise.all(sentencePromises);
    return translatedSentences.join("");
  });
  const translatedParagraphs = await Promise.all(translationPromises);
  let translationText = translatedParagraphs.join("\n\n").trim();
  if (translationText.startsWith("'") && translationText.endsWith("'")) {
    translationText = translationText.slice(1, -1);
  }
  outputElement.innerHTML = translationText;
  fadeIn(outputElement);
  adjustFontSizeOfInputs();
  clearAudio();
  
  try {
    addTTS(document.getElementById("text-input2").innerHTML, translateTo);
  } catch (error) {
    console.error("Cannot Create Audio File:", error);
  }
  
  let pronounceBox = outputBox;
  let pronounceText = translationText;
  if (translateTo.includes("English")) {
    pronounceBox = activeInput;
    pronounceText = document.getElementById(`text-input${activeInput}`).innerHTML;
  }
  if (addPronounce) {
    const botMessage = await chatgptRequest(
      "gpt-3.5-turbo",
      "Respond strictly in this format: Pronounce: [{simple phonetic pronunciation}]",
      `Give a dialect-accurate phonetic pronunciation for: '${pronounceText}' (${translateFrom}) in ${translateTo}. Provide it in a way that is easy to read and understand, avoiding IPA. Make sure to include specific dialect nuances. Use hyphens to separate syllables.`
    );
    let pronounce = botMessage.split("Pronounce:")[1]?.trim();
    if (pronounce) {
      pronounce = pronounce.replace(/[[\]{}]/g, '').trim();
      pronounce = `[${pronounce}]`;
      addPronounceBox(pronounce, pronounceBox);
    }
  }
  
  clearMoreInfo();
  if (document.getElementById(`text-input${pronounceBox}`).textContent.length <= 20) {
    await sleep(0.7);
    const button = document.createElement('button');
    button.className = 'more-info-button';
    button.innerHTML = '<span>MORE INFO</span>';
    button.style.opacity = '0';
    const wrapper = document.querySelector('.wrapper');
    if (wrapper) {
      wrapper.appendChild(button);
      fadeIn(button);
    }
    button.addEventListener('click', () => moreInfo(pronounceText, translateTo, pronounceBox));
  }
}

// ─── SPEECH-TO-TEXT (STT) ─────────────────────────────────────────

let mediaRecorder, stream, isRecording = false, audioChunks = [];
async function startRecording(recordingBox) {
  setActiveInput(recordingBox);
  const recordButton = document.getElementById(`recordButton${recordingBox}`);
  const inputElement = document.getElementById(`text-input${recordingBox}`);
  recordButton.src = "icons/stop.svg";
  const storedPlaceholder = inputElement.getAttribute('data-placeholder');
  inputElement.innerHTML = "";
  adjustFontSizeOfInputs();
  inputElement.setAttribute('data-placeholder', 'Listening..');
  inputElement.setAttribute('contenteditable', 'false');
  inputElement.classList.add('listening-placeholder');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    mediaRecorder.addEventListener("dataavailable", event => audioChunks.push(event.data));
    mediaRecorder.addEventListener("stop", async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");
      formData.append("model", "whisper-1");
      try {
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }
        const result = await response.json();
        inputElement.setAttribute('contenteditable', 'true');
        inputElement.classList.remove('listening-placeholder');
        inputElement.setAttribute('data-placeholder', storedPlaceholder);
        document.getElementById(`text-input${recordingBox}`).innerText = result.text;
        clearOtherInput(recordingBox);
        translateText();
      } catch (error) {
        console.error("Error during the fetch operation:", error);
      } finally {
        isRecording = false;
        audioChunks = [];
        recordButton.src = "icons/microphone.svg";
        stream.getTracks().forEach(track => track.stop());
      }
    });
    setTimeout(() => { if (isRecording) stopRecording(recordingBox); }, 10000);
  } catch (error) {
    console.error("Error accessing media devices:", error);
    recordButton.src = "icons/microphone.svg";
  }
}

function stopRecording(recordingBox) {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    const recordButton = document.getElementById(`recordButton${recordingBox}`);
    recordButton.src = "icons/microphone.svg";
    stream.getTracks().forEach(track => track.stop());
  }
}

function toggleRecording(recordingBox) {
  isRecording ? stopRecording(recordingBox) : startRecording(recordingBox);
}
window.toggleRecording = toggleRecording;

// ─── TEXT-TO-SPEECH (TTS) ─────────────────────────────────────────

let addPlaybackSpeed = false;
async function addTTS(inputText, language) {
  for (let lang in langVoices) {
    if (getLanguage(2).toLowerCase().includes(lang)) {
      selectedVoice = langVoices[lang];
      break;
    }
  }
  if (addPlaybackSpeed) {
    const speedSlider = document.createElement("input");
    const range = 0.28;
    speedSlider.type = "range";
    speedSlider.min = 1 - range;
    speedSlider.max = 1 + range;
    speedSlider.step = range;
    speedSlider.value = "1";
    speedSlider.classList.add("speed-slider");
    const sliderLabel = document.createElement("label");
    sliderLabel.textContent = "Playback:";
    sliderLabel.classList.add("slider-label");
    const sliderContainer = document.createElement("div");
    sliderContainer.classList.add("slider-container");
    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(speedSlider);
    const container = document.querySelector(".input-wrapper");
    container.insertBefore(sliderContainer, container.firstChild);
  }
  const TTSText = `[${language}] ${inputText}`;
  const selectedModel = "tts-1";
  const response = await fetch("https://api-5ol644xcrq-uc.a.run.app/getTTS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: selectedModel, voice: selectedVoice, input: TTSText, format: "mp3" })
  });
  if (!response.ok) {
    console.error("Error calling TTS endpoint:", response.status);
    return;
  }
  const data = await response.blob();
  const audioUrl = URL.createObjectURL(data);
  const audioPlayer = document.getElementById("audioPlayer");
  audioPlayer.src = audioUrl;
  if (addPlaybackSpeed) {
    speedSlider.addEventListener("input", () => {
      audioPlayer.playbackRate = speedSlider.value;
    });
  }
  const playButton = document.getElementById("playButton");
  playButton.style.opacity = 1;
  playButton.style.cursor = "pointer";
}

// ─── SETTINGS ─────────────────────────────────────────────────────

const voiceLinks = {
  alloy: new Audio('https://www.dropbox.com/scl/fi/381pg6cejvp8shhzom4fi/alloy.mp3?rlkey=wooqhfjepcqi9na6zf474ft8l&st=kbq7ymtv&dl=1'),
  echo: new Audio('https://www.dropbox.com/scl/fi/3kzyxo040zrru5depoqqf/echo.mp3?rlkey=ku3i0w015mqv77uynl16opxp9&st=2lwvrurc&dl=1'),
  fable: new Audio('https://www.dropbox.com/scl/fi/559t2ej2ydb6i9skp0ndm/fable.mp3?rlkey=cgpeu5mh0xvmnd3djkobv2exj&st=evabqqkk&dl=1'),
  nova: new Audio('https://www.dropbox.com/scl/fi/ng2bdd99uqo3ypdsxjvak/nova.mp3?rlkey=5qf7mf31xh7htg10tukwlfjia&st=xnvimknc&dl=1'),
  onyx: new Audio('https://www.dropbox.com/scl/fi/bho179u14dzctjwn3pje0/onyx.mp3?rlkey=uffxlnz1mn2asc5wwjcsqh42j&st=duo39rz2&dl=1'),
  shimmer: new Audio('https://www.dropbox.com/scl/fi/gumt2xg7wi5olluiyig3h/shimmer.mp3?rlkey=rfbl001ndx0g93fup8pq94ujo&st=ahxwp0eg&dl=1')
};

function showVoiceOptions() {
  document.querySelector('.settings-main').style.display = 'none';
  document.querySelector('.choose-voice').style.display = 'block';
  highlightVoice(selectedVoice);
}

function showSettings() {
  document.querySelector('.choose-voice').style.display = 'none';
  document.querySelector('.settings-main').style.display = 'block';
}

function selectVoice(voice) {
  highlightVoice(voice);
  selectedVoice = voice;
  setTimeout(() => playVoiceSound(voice), 350);
}

function playVoiceSound(voice) {
  const audio = voiceLinks[voice];
  audio.currentTime = 0;
  audio.play().catch(error => console.error(`Error playing sound: ${error.message}`));
}

function highlightVoice(voice) {
  document.querySelectorAll('.settings-container.choose-voice .settings-item').forEach(item => item.classList.remove('selected'));
  const selectedItem = document.querySelector(`.settings-container.choose-voice .settings-item[data-voice="${voice}"]`);
  if (selectedItem) selectedItem.classList.add('selected');
}

// ─── EVENT LISTENERS & DOMContentLoaded ───────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Load recent languages
  loadLanguages();

  // Translate button
  const translateButton = document.querySelector(".translate-button");
  let cooldown = false;
  translateButton.addEventListener("click", () => {
    if (!cooldown) {
      translateText();
      cooldown = true;
      translateButton.disabled = true;
      setTimeout(() => {
        cooldown = false;
        translateButton.disabled = false;
      }, cooldownTime);
    }
  });
  
  // Input field for language overlay
  const inputField = document.querySelector('.langchoice-input input[type="text"]');
  const confirmArrow = document.querySelector(".confirm-arrow");
  inputField.addEventListener("input", () => {
    let clearButton = document.querySelector(".clear-text-btn");
    if (inputField.value.trim() !== "") {
      confirmArrow.style.opacity = 0.8;
      confirmArrow.style.cursor = "pointer";
      // (Clear button creation/positioning code removed)
    } else {
      confirmArrow.style.opacity = 0.4;
      confirmArrow.style.cursor = "default";
      if (clearButton) removeClearButton(clearButton);
    }
    closeLangGrid();
  });
  
  // Input click switching
  document.querySelector(".input1").addEventListener("click", e => handleClick(e, 1));
  document.querySelector(".input2").addEventListener("click", e => handleClick(e, 2));
  
  // Remove formatting on paste
  document.querySelectorAll('.text-input').forEach(el => {
    el.addEventListener('paste', event => {
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text);
    });
  });
  
  // Overlay keydown events
  const langOverlay = document.getElementById("langchoice-overlay");
  document.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && langOverlay && langOverlay.style.display !== 'none') {
      selectLanguage();
    }
    if (event.key === "Escape" && langOverlay && langOverlay.style.display !== 'none') {
      closeOverlay();
    }
  });
  confirmArrow.addEventListener("click", () => selectLanguage());
  
  // Overlay open events
  document.getElementById("box1").addEventListener("click", () => { currentBox = "box1"; openOverlay(); });
  document.getElementById("box2").addEventListener("click", () => { currentBox = "box2"; openOverlay(); });
  
  // Input switching animation
  const switchArrow = document.querySelector('.translate-section img[alt="Switch Arrow"]');
  const inputContainer1 = document.querySelector(".input-container.input1");
  const inputContainer2 = document.querySelector(".input-container.input2");
  inputContainer1.style.order = 1;
  inputContainer2.style.order = 3;
  switchArrow.addEventListener("click", () => {
    inputContainer1.style.transform = "translateY(100%)";
    inputContainer2.style.transform = "translateY(-100%)";
    setTimeout(() => {
      [inputContainer1.style.order, inputContainer2.style.order] = [inputContainer2.style.order, inputContainer1.style.order];
      inputContainer1.style.transform = "";
      inputContainer2.style.transform = "";
    }, 300);
  });
});

function loadLanguages() {
  fetch("recent-langs.txt")
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch languages");
      return response.text();
    })
    .then(text => {
      const lines = text.trim().split("\n");
      const languageList = document.getElementById("language-list");
      if (!languageList) return;
      lines.forEach(line => {
        const [language, flagUrl = 'default-flag.png', location] = line.split("|");
        if (!language) return;
        const li = document.createElement("li");
        li.onclick = () => confirmLanguage(language, flagUrl);
        li.innerHTML = `
          <div class="flag"><img src="${flagUrl}" alt="${language}" onerror="this.src='default-§.png'"></div>
          <div class="langchoice-text">${language}${location ? `<small>${location}</small>` : ""}</div>
        `;
        languageList.appendChild(li);
      });
    })
    .catch(error => console.error("Error loading languages:", error));
}

function closeLangGrid() {
  const gridDiv = document.querySelector(".language-grid");
  const langChoiceOptions = document.querySelector(".langchoice-options");
  if (gridDiv) {
    gridDiv.style.height = '0';
    gridDiv.style.opacity = '0';
    if (langChoiceOptions) langChoiceOptions.style.maxHeight = '75%';
    setTimeout(() => gridDiv.remove(), 500);
  }
}

function openOverlay() {
  const overlay = document.getElementById("langchoice-overlay");
  overlay.style.display = "flex";
  overlay.style.opacity = 0;
  setTimeout(() => overlay.style.opacity = "1", 10);
  document.querySelector('.langchoice-input input[type="text"]').focus();
}

function closeOverlay() {
  const overlay = document.getElementById("langchoice-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => overlay.style.display = "none", 300);
}

function removeClearButton(clearButton) {
  fadeOut(clearButton, true, 0.1);
}