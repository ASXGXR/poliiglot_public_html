// GLOBAL VARIABLES //

const cooldownTime = 2000; // Cooldown time (2 seconds)
const fade_time = "0.19"; // Fade transition time
let selectedVoice = "echo"; // Default voice
let activeInput = 1;
let outputBox = 2;
let currentBox = null;
const langVoices = {
  "french": "onyx",
  "thai": "echo",
  "hindi": "onyx",
  "arabic": "onyx",
  "mandarin": "shimmer",
  "american": "alloy",
  "english": "alloy",
  "italian": "nova",
  "patois": "shimmer",
};

const easyTranslates = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Chinese", "Japanese",
  "Korean", "Arabic", "Hindi", "Bengali", "Urdu", "Turkish", "Persian", "Polish", "Swedish", "Norwegian",
  "Danish", "Finnish", "Greek", "Hungarian", "Czech", "Slovak", "Ukrainian", "Romanian", "Bulgarian", "Serbian",
  "Croatian", "Slovenian", "Hebrew", "Indonesian", "Malay", "Thai", "Vietnamese", "Filipino", "Swahili", "Zulu",
  "Xhosa", "Amharic", "Tamil", "Telugu", "Kannada", "Marathi", "Gujarati", "Punjabi", "Sinhala", "Burmese",
  "Parisian French"
];



// REUSED FUNCTIONS //


// Api Key //

let key = "";

// Fetch API key from openai.php
function getApi() {
  try {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "openai.php", false);
    xmlhttp.send();

    if (xmlhttp.status === 200) {
      const response = JSON.parse(xmlhttp.responseText || "{}");
      return response.key || console.warn("Error retrieving API key:", response.error) || "";
    }
    console.error(`Failed to fetch API key: ${xmlhttp.statusText}`);
  } catch (e) {
    console.error("Error fetching API key:", e);
  }
  return "";
}

// Show the API key input box if fetching fails
function handleApiKey() {
  key = getApi();
  document.getElementById("apiKeyContainer").style.display = key ? "none" : "flex";
  console[key ? "log" : "warn"](key ? "Using fetched API key." : "API key fetch failed, showing input box.");
}

// Set API key from input box
function setApiKey() {
  const input = document.getElementById("apiKeyInput").value.trim();
  key = input || key;
  document.getElementById('apiKeyContainer').style.display = 'none';
}



// When More Info is Clicked
async function moreInfo(text,language,pronounceBox) {
  fadeOutAll("more-info-button");

  // Calling chatGPT
  let prompt = `“${text}”. The user knows the meaning of this phrase and how to pronounce from AI. Provide a few bullet points about this; variants, its literal meaning, and common responses. Use gender differences and pronunciation tips sparingly when relevant. Put quotes around ${language} phrases, and keep responses under 70 words.`
  // console.log(prompt);
  const botMessage = await chatgptRequest(
    "gpt-3.5-turbo",
    "",
    prompt,
    key
  );
  // console.log(botMessage);

  // Create the title
  const wrapperElement = document.querySelector('.wrapper');
  wrapperElement.insertAdjacentHTML('beforeend', `
    <div class="more-info-title">
      <div class="line"></div>
      <h2>MORE INFO</h2>
      <div class="line"></div>
    </div>
  `);
  const titleElement = wrapperElement.querySelector('.more-info-title');
  fadeIn(titleElement,"flex");
  await sleep(0.5);

  // Create the info box
  const infoSection = document.createElement('div');
  infoSection.className = 'info-section';

  // Split the message
  const infoItems = botMessage
  .split(/-\s+/)
  .filter(item => item.trim() !== ""); // filters empties

  // Strings to Exclude from More Info
  const excludeStrings = ["no gender", "none"];

  let not_pronounce_box = (pronounceBox === 1) ? 2 : 1;
  let english_text = document.getElementById(`text-input${not_pronounce_box}`).innerHTML; // Exclude English Text

  // Add each item as its own div within info-section
  infoItems.forEach(item => {
    
    // Check if item contains any of the exclude strings
    if (excludeStrings.some(str => item.toLowerCase().includes(str.toLowerCase()))) {
      return; // Skip this item
    }

    // Create Div for Each Item
    const itemDiv = document.createElement('div');
    itemDiv.className = 'info-item';

    // Split item by the first colon to separate the header and content
    const [header, ...contentArray] = item.split(':');
    const content = contentArray.join(':').trim();

    // Check if the header should be h2 or normal text
    const headerWords = header.trim().split(/\s+/);
    if (headerWords.length <= 2) {
      // Create and append the header
      const headerElement = document.createElement('h2');
      headerElement.className = 'header';
      headerElement.textContent = header.trim();
      itemDiv.appendChild(headerElement);
    } else {
      // Create and append the normal text for longer headers
      const textElement = document.createElement('p');
      textElement.textContent = header.trim();
      itemDiv.appendChild(textElement);
    }

    // Check if the header contains "literal" and content contains english_text
    if (header.trim().toLowerCase().includes("literal") && content.toLowerCase().includes(english_text.toLowerCase())) {
      return; // Skip this item
    }


    // Make words in quotes or containing non-basic English characters clickable if the line contains "variants" or "responses"
    let processedContent = content;
    if (/variant/i.test(header) || /response/i.test(header) || /variant/i.test(content) || /response/i.test(content)) {
      // Replace quoted words and words containing non-ASCII characters with clickable spans
      processedContent = content
        .replace(/"([^"]+)"/g, '<span class="clickable-phrase">$1</span>') // Remove quotations
        .replace(/(\b[\w]*[^\x00-\x7F]+[\w]*\b)/gu, '<span class="clickable-phrase">$1</span>'); // Matches words containing non-basic English characters
    }


    // Create and append the content
    const contentElement = document.createElement('p');
    contentElement.innerHTML = processedContent;
    itemDiv.appendChild(contentElement);

    // Append the item div to the info section
    infoSection.appendChild(itemDiv);

    // Add click event listeners to clickable phrases
    const clickablePhrases = itemDiv.querySelectorAll('.clickable-phrase');
    clickablePhrases.forEach(phrase => {
      phrase.addEventListener('click', handleClickablePhraseClick);
    });
  });


  // Appending Info Section
  wrapperElement.appendChild(infoSection);
  fadeIn(infoSection);

  // Function to handle clickable phrase click
  function handleClickablePhraseClick(event) {
    const text = event.target.textContent;
    document.getElementById(`text-input${pronounceBox}`).innerHTML = text;
    clearOtherInput(pronounceBox);
    translateText();
  }
}


// Getting Flag From Country Name
async function getFlagUrl(countryName) {
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
      if (imageUrl) return imageUrl;
    }

    return null;
  } catch (error) {
    console.error('Error fetching flag SVG:', error);
    return null;
  }
}


// Getting Language From Box
function getLanguage(box) {
  const langLabel = document.querySelector(`.input${box} .language-label`).textContent;
  return langLabel
}

// Calling ChatGPT
async function chatgptRequest(model, system, prompt, key) {
  const messages = [];

  if (system) {
    messages.push({
      role: "system",
      content: system,
    });
  }
  messages.push({
    role: "user",
    content: prompt,
  });
  const requestBody = JSON.stringify({
    model: model,
    messages: messages,
  });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: requestBody,
  });

  const data = await response.json();
  const botMessage = data.choices[0].message.content;
  return botMessage;
}

// Clearing Audio From Play Button
function clearAudio() {
  const audioPlayer = document.getElementById("audioPlayer");
  const playButton = document.getElementById("playButton");
  
  // Stop and clear the audio source
  audioPlayer.pause();
  audioPlayer.src = "";
  audioPlayer.load();
  
  // Set play button opacity back to 0.3
  playButton.style.opacity = 0.3;
  playButton.style.cursor = "default";
}

// Time.sleep
function sleep(s) {
  const ms = s*1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Adjusting Font Size of Inputs
function adjustFontSizeOfInputs() {
  var inputElements = document.querySelectorAll(".text-input");

  inputElements.forEach(function (inputElement) {
    var textLength = inputElement.textContent.trim().length;
    var calculatedFontSize = Math.round((-0.06 * textLength + 20.06) * 2) / 2;
    var fontSize = calculatedFontSize < 15 ? 15 : calculatedFontSize;
    inputElement.style.fontSize = fontSize + "px";
  });
  checkCharCount();
}

// Checking Character Count
const maxchars = 500;
function checkCharCount() {
  var char_limit = document.getElementById(`char-limit${activeInput}`);
  var inputElement = document.getElementById(`text-input${activeInput}`);
  var textContent = inputElement.textContent.trim();
  var textLength = textContent.length;

  // Limit text length
  if (textLength > maxchars) {
    inputElement.textContent = textContent.substring(0, maxchars);
    textContent = inputElement.textContent.trim(); // Update textContent after trimming
    textLength = textContent.length; // Update textLength after trimming
    // Place cursor at the end of the text
    placeCaretAtEnd(inputElement);
  }

  // Update character count display
  if (textLength >= maxchars * 0.9) {
    char_limit.innerHTML = `${textLength} / ${maxchars}`;
    char_limit.style.opacity = '0.3';
  } else {
    char_limit.style.opacity = '0';
  }
}
function clearCharCount(number) {
  const char_limit = document.getElementById(`char-limit${number}`);
  fadeOut(char_limit,false);
}
// Place cursor at the end of the text
function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != "undefined"
      && typeof document.createRange != "undefined") {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}


// Loading Recently Used Languages
async function loadLanguages() {
  try {
    const response = await fetch("recent-langs.txt");
    if (!response.ok) throw new Error(`Failed to fetch languages`);

    const text = await response.text();
    const lines = text.trim().split("\n");
    const languageList = document.getElementById("language-list");
    if (!languageList) return;

    lines.forEach((line) => {
      const [language, flagUrl = 'default-flag.png', location] = line.split("|");
      if (!language) return;

      const li = document.createElement("li");
      li.onclick = () => confirmLanguage(language, flagUrl);

      li.innerHTML = `
        <div class="flag"><img src="${flagUrl}" alt="${language}" onerror="this.src='default-flag.png'"></div>
        <div class="langchoice-text">${language}${location ? `<small>${location}</small>` : ""}</div>
      `;

      languageList.appendChild(li);
    });

  } catch (error) {
    console.error("Error loading languages:", error);
  }
}


// Clearing Inputs If Either Edited
function clearOtherInput(inputNumber) {
  if (inputNumber === 1) {
    document.getElementById("text-input2").innerHTML = "";
    clearCharCount('2');
  } else if (inputNumber === 2) {
    document.getElementById("text-input1").innerHTML = "";
    clearCharCount('1');
  }
  clearMoreInfo();
  clearPronounce();
  clearAudio();

  // Adjust font size
  adjustFontSizeOfInputs();
}
function clearPronounce() {
  // Find all pronunciation boxes
  const pronunciationBoxes = document.querySelectorAll('.pronunciation-box');
  pronunciationBoxes.forEach(box => {
    // Smoothly transition the box
    box.style.opacity = '0';
    box.style.height = '0px';
    // Remove the box after the transition
    setTimeout(() => {
      box.remove();
    }, 200);
  });
}
function addPronounce(pronounce,pronounceBox) {
  // Create and configure new box
  let newBox = document.createElement("div");
  newBox.className = "pronunciation-text";
  newBox.textContent = pronounce;
  newBox.style.opacity = "0.4";
  
  // Find the existing .input-container.input2 element
  let existingContainer = document.querySelector(`.input-container.input${pronounceBox}`);
  
  // Clear current pronunciation boxes and create a new one
  clearPronounce();
  let pronunciationBox = document.createElement("div");
  pronunciationBox.className = "pronunciation-box";
  pronunciationBox.style.height = '0px'; // Start with 0 height
  pronunciationBox.appendChild(newBox); // Append new pronunciation text

  // Append the pronunciation box before char-limit
  let charLimitElement = document.getElementById(`char-limit${pronounceBox}`);
  existingContainer.insertBefore(pronunciationBox, charLimitElement);

  // Smooth transition
  setTimeout(() => {
    pronunciationBox.style.height = newBox.scrollHeight + 'px'; // Set to the height of the content
    pronunciationBox.style.opacity = '1';
  }, 10);
}


// Fading In and Out
// For single element
function fadeOut(element, remove = true, s = fade_time) {
  if (element) {
    element.style.transition = `opacity ${s}s ease`;
    element.style.opacity = '0';
    if (remove === true) {
      element.addEventListener('transitionend', () => {
        element.remove();
      }, { once: true });
    }
  }
}
// example usage:
// fadeIn(document.getElementById("myElement"));
function fadeIn(element, display = 'block', s = fade_time) {
  element.style.opacity = '0';
  element.style.display = display; // Ensure the element is displayed

  // Force a reflow to ensure the initial opacity is applied
  element.getBoundingClientRect();
  element.style.transition = `opacity ${s}s ease`;
  setTimeout(() => {
    element.style.opacity = '1';
  }, 10);
}

// switch one element for another
function fadeSwitch(element, new_element) {
  fadeOut(element, false);
  
  element.addEventListener('transitionend', () => {
    element.replaceWith(new_element);
    fadeIn(new_element);
  }, { once: true });
}

// For all elements (enter class name)
function fadeOutAll(className,s=fade_time) {
  const elements = document.querySelectorAll(`.${className}`);
  elements.forEach(element => {
    element.style.transition = `opacity ${s}s ease`;
    element.style.opacity = '0';

    // Remove the element from the DOM after the transition ends
    element.addEventListener('transitionend', () => {
      element.remove();
    }, { once: true }); // Ensure the event listener is called only once
  });
}
function fadeInAll(className,s=fade_time) {
  const elements = document.querySelectorAll(`.${className}`);
  elements.forEach(element => {
    element.style.display = 'block';
    element.style.transition = `opacity ${s}s ease`;
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10); // Ensure the opacity transition happens
  });
}

// Clears More Info Section
function clearMoreInfo() {
  fadeOutAll("more-info-title");
  fadeOutAll("more-info-button");
  fadeOutAll("info-section");
}


// EVENT LISTENERS //


// Removing Formatting on Pasted Text
document.querySelectorAll('.text-input').forEach(element => {
  element.addEventListener('paste', function(event) {
    event.preventDefault();

    // Get the plain text content from the clipboard
    const text = (event.clipboardData || window.clipboardData).getData('text');

    // Insert the plain text into the contenteditable div
    document.execCommand('insertText', false, text);
  });
});

// If Input 1 Edited
document.getElementById("text-input1").addEventListener("input", function() {
  clearOtherInput(1);
});
// If Input 2 Edited
document.getElementById("text-input2").addEventListener("input", function() {
  clearOtherInput(2);
});

// Input Boxes Click Radius + Set Active
function handleClick(event, inputNumber) {
  if (
    event.target.classList.contains("recordButton") ||
    event.target.id === "playButton"
  ) {
    event.stopPropagation();
  } else {
    setActiveInput(inputNumber);
    document.querySelector(`#text-input${inputNumber}`).focus();
  }
}
document.querySelector(".input1").addEventListener("click", function (event) {
  handleClick(event, 1);
});
document.querySelector(".input2").addEventListener("click", function (event) {
  handleClick(event, 2);
});
function setActiveInput(inputNumber) {
  activeInput = inputNumber;
  outputBox = inputNumber === 1 ? 2 : 1;
}

// Clearing Placeholder Text
function clearPlaceholder(element) {
  if (element.textContent.trim() === element.getAttribute("data-placeholder")) {
    element.textContent = "";
  }
}




// DOM FULLY LOADED
document.addEventListener("DOMContentLoaded", () => {

  handleApiKey();

  // Load Recent Languages
  loadLanguages();


  // Changing Confirm Button Opacity and Adding Clear Button

  const inputField = document.querySelector('.langchoice-input input[type="text"]');
  const confirmArrow = document.querySelector(".confirm-arrow");

  inputField.addEventListener("input", () => {
    let clearButton = document.querySelector(".clear-text-btn");
    if (inputField.value.trim() !== "") {
      confirmArrow.style.opacity = 0.8;
      confirmArrow.style.cursor = "pointer";
      if (!clearButton) { 
        clearButton = createClearButton();
      }
      adjustClearButtonPosition(clearButton);
    } else {
      confirmArrow.style.opacity = 0.4;
      confirmArrow.style.cursor = "default";
      if (clearButton) {
        removeClearButton(clearButton);
      }
    }
    closeLangGrid(); // Close the language grid when input changes
  });

  // Initial adjustment for clear button position
  adjustClearButtonPosition(document.querySelector(".clear-text-btn"));
});



// Text Clear Button
function createClearButton() {
  // const inputWrapper = document.querySelector('.langchoice-input');
  // const clearButton = document.createElement("img");
  // clearButton.src = "icons/clear.svg";
  // clearButton.className = "clear-text-btn";
  // clearButton.style.cursor = "pointer";
  // clearButton.style.opacity = 0;
  // clearButton.onclick = () => {
  //   inputField.value = "";
  //   removeClearButton(clearButton);
  // };
  // inputWrapper.appendChild(clearButton);
  // fadeIn(clearButton);
  // return clearButton; // Return the created clear button
}
function removeClearButton(clearButton) {
  fadeOut(clearButton, true, 0.1);
}
function adjustClearButtonPosition(clearButton) {
  // if (clearButton) {
  //   // Show clear button
  //   clearButton.style.opacity = 0.5;

  //   // Create a temporary span to measure the text width
  //   const tempSpan = document.createElement("span");
  //   tempSpan.style.visibility = "hidden";
  //   tempSpan.style.whiteSpace = "nowrap"; // Ensure white spaces are measured
  //   tempSpan.innerText = inputField.value;
  //   document.body.appendChild(tempSpan);

  //   // Calculate the width of the text
  //   const textWidth = tempSpan.getBoundingClientRect().width;
  //   document.body.removeChild(tempSpan);

  //   // Adjust the position of the clear button
  //   const inputRect = inputField.getBoundingClientRect();
  //   const screenWidth = window.innerWidth;
  //   const text_distance = 16; // Higher values = closer
  //   const offset = inputRect.left + (-screenWidth-0)*0.2 - textWidth;
  //   console.log(offset);
  //   clearButton.style.left = `${-offset}px`;
  // }
}


// If Enter Pressed -> Select Language
const langOverlay = document.getElementById("langchoice-overlay");
document.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && overlayIsActive()) {
    selectLanguage();
  }
  // If Escape -> Close Overlay
  if (event.key === "Escape" && overlayIsActive()) {
    closeOverlay();
  }
});
function overlayIsActive() {
  return langOverlay && langOverlay.style.display !== 'none';
}
// If Confirm Clicked -> Select Language
const confirmArrow = document.querySelector(".confirm-arrow");
confirmArrow.addEventListener("click", async () => {
  selectLanguage();
});

// Closing Grid
function closeLangGrid() {
  let gridDiv = document.querySelector(".language-grid");
  let langChoiceOptions = document.querySelector(".langchoice-options");
  if (gridDiv) {
    gridDiv.style.height = '0';
    gridDiv.style.opacity = '0';
    langChoiceOptions.style.maxHeight = '75%';
    setTimeout(() => {
      gridDiv.remove();
    }, 500); // Allow time for the transition to complete before removing the element
  }
}

// Opening Overlay when clicked
document.getElementById("box1").addEventListener("click", function () {
  currentBox = "box1";
  openOverlay();
});
document.getElementById("box2").addEventListener("click", function () {
  currentBox = "box2";
  openOverlay();
});

function openOverlay() {
  const overlay = document.getElementById("langchoice-overlay");
  overlay.style.display = "flex";
  overlay.style.opacity = 0;
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10); // Small delay to allow the display change to take effect
  document.querySelector('.langchoice-input input[type="text"]').focus();
}
function closeOverlay() {
  const overlay = document.getElementById("langchoice-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.style.display = "none";
  }, 300); // Match the delay to the CSS transition duration (300ms)
}

// Input Switching Logic
document.addEventListener("DOMContentLoaded", function () {
  const switchArrow = document.querySelector(
    '.translate-section img[alt="Switch Arrow"]',
  );
  const inputContainer1 = document.querySelector(".input-container.input1");
  const inputContainer2 = document.querySelector(".input-container.input2");

  // Set initial order values
  inputContainer1.style.order = 1;
  inputContainer2.style.order = 3;

  switchArrow.addEventListener("click", function () {
    // Apply translation effect
    inputContainer1.style.transform = "translateY(100%)";
    inputContainer2.style.transform = "translateY(-100%)";

    setTimeout(() => {
      // Swap the order properties
      const order1 = inputContainer1.style.order;
      inputContainer1.style.order = inputContainer2.style.order;
      inputContainer2.style.order = order1;

      // Reset the transform properties
      inputContainer1.style.transform = "";
      inputContainer2.style.transform = "";
    }, 300); // Match the CSS transition duration
  });
});



// SELECTING LANGUAGE //

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

  // Add shake class and remove after animation ends
  icon.classList.add('shake');
  icon.addEventListener('animationend', () => icon.classList.remove('shake'), { once: true });
}

async function selectLanguage(detected = null) {

  let country_name = "";
  let language = "";
  let botMessage;  // Declare botMessage at the function scope

  // Close language grid
  closeLangGrid();

  // Getting User Input; if not: Detect Language
  let userInput = detected ?? document.querySelector('.langchoice-input input[type="text"]').value;

  // Check if response already stored
  let storedMessage = localStorage.getItem(`langOrDialect_${userInput.toLowerCase()}`);
  if (storedMessage) {
    console.log(`Retrieved from storage: ${storedMessage}`);
    botMessage = storedMessage;
  } else {

    // CHATGPT: Dialect or Place?
    botMessage = (await chatgptRequest(
      "gpt-3.5-turbo",
      "Give 1 word response: language, dialect, place, or none (if no language can be linked to this)",
      `${userInput}: language, dialect or place?`,
      key
    )).toLowerCase();
    
    // Add to local storage
    localStorage.setItem(`langOrDialect_${userInput.toLowerCase()}`, botMessage);
    console.log(botMessage);
  }
  
  
  if (botMessage.includes("dialect") || botMessage.includes("language")) {  // DIALECT / LANGUAGE

    // Closes Overlay
    closeOverlay();

    const responses = await Promise.all([
      chatgptRequest(
        "gpt-3.5-turbo",
        "Strictly follow the format: Language: {dialect}, Country: {country_name}, don't add anything",
        `If otherwise, provide the UK spelling of ${userInput}; identify country most associated with this language`,
        key,
      ),
    ]);

    botMessage = responses[0];
    language = botMessage.match(/Language:\s*([^,]*)/)[1].trim();
    country_name = botMessage.match(/Country:\s*([^,]*)/)[1].trim();
    flagSrc = responses[1];

    confirmLanguage(language, country_name);
  
  
  } else if (botMessage.includes("place")) {  // PLACE

    botMessage = await chatgptRequest(
      "gpt-3.5-turbo",
      "Strictly follow the format, and don't give any other information: Dialects: language1 (%),language2 (%),etc..",
      `Provide the top dialects spoken in ${userInput}. If one main dialect is spoken across in this place, just provide that one. If multiple dialects spoken, provide a maximum of 6, with a percentage estimate for how useful it would be to know this language when visiting.`,
      key,
    );
    console.log(botMessage);

    // Getting Languages
    let languagesMatch = botMessage.match(/Dialects:\s*([^]+?)(?:\n\n|$)/);
    // Trims dialects if needed
    languagesString = languagesMatch?.[1]?.trim() ?? botMessage.trim();

    // Splitting Language List
    let language_list = languagesString
      .split(",")
      .map((lang) => lang.trim())
      .filter((item) => !item.toLowerCase().includes("language"));

    // If 1 language has 100%, ignore rest
    const itemWith100Percent = language_list.find((item) => item.includes("100%"));
    if (itemWith100Percent) language_list = [itemWith100Percent];

    // IF Len > 1, Add Language Grid
    if (language_list.length > 1) {

      let langChoiceInput = document.querySelector(".langchoice-input");
      let gridDiv = document.createElement("div");
      gridDiv.classList.add("language-grid");

      language_list.forEach((language) => {
        let languageDiv = document.createElement("div"); // Use div instead of langgrid
        languageDiv.classList.add("language-grid-item");
        languageDiv.textContent = language;

        languageDiv.onclick = async () => {
          confirmLanguage(language.split("(")[0].trim(), country_name);
        };

        gridDiv.appendChild(languageDiv);
      });

      langChoiceInput.insertAdjacentElement("afterend", gridDiv);
      let langChoiceOptions = document.querySelector(".langchoice-options");

      // Smooth transition
      setTimeout(() => {
        gridDiv.style.height = gridDiv.scrollHeight + 'px'; // Set to the height of the content
        gridDiv.style.opacity = '1';
        langChoiceOptions.style.maxHeight = '50%';
      }, 10);

      botMessage = await chatgptRequest(
        "gpt-3.5-turbo",
        "Strictly follow the format: Country: {country_name}",
        `Give ${userInput}'s country. If unable, give country most associated with ${languagesString}`,
        key,
      );
      console.log(botMessage);
      country_name = botMessage.split(':').pop().trim();
      

    // No Language List
    } else {

      // Closes Overlay
      closeOverlay();

      language = language_list[0].split("(")[0].trim();
      botMessage = await chatgptRequest(
        "gpt-3.5-turbo",
        "Strictly follow the format: Country: {country_name}",
        `Give ${userInput}'s country. If unable, give country most associated with ${languagesString}`,
        key,
      );
      console.log(botMessage);
      country_name = botMessage.split(':').pop().trim();
      confirmLanguage(language, country_name);

    }
  } else {  // OTHER
    // Error animation on button
    errorShake(document.querySelector(".confirm-arrow"));
  }

}

async function confirmLanguage(language, flag) {

  // Closing Overlay
  closeOverlay();

  // Filtering Language
  const filterWords = ["standard", "general", "modern"];
  filterWords.forEach(word => {
    language = language.replace(new RegExp(word, "gi"), "").trim();
  });
  language = language.includes(":") ? language.split(":")[1].trim() : language;

  // Get the box and the box text element
  const box = document.getElementById(currentBox);
  const boxText = box.querySelector(".box-text");
  const currentBoxId = currentBox.replace("box", "");

  // Fading Out Flag
  const flagImg = box.querySelector(".flag img");
  fadeOut(flagImg,false);

  // Smoothly Change Box Text
  function changeBoxText() {
    // Add CSS transition for smooth change
    box.style.transition = "width 0.84s ease";

    // Ensure the box has an initial width
    const initialWidth = box.getBoundingClientRect().width;
    box.style.width = `${initialWidth}px`;

    // Force reflow to ensure the initial width is applied
    box.getBoundingClientRect();

    // Create a temporary span to measure the new width
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.whiteSpace = "nowrap";
    tempSpan.innerText = language;
    document.body.appendChild(tempSpan);

    // Calculate the new width with padding
    const newWidth = tempSpan.getBoundingClientRect().width + 40;
    document.body.removeChild(tempSpan);

    // Set the width of the box
    requestAnimationFrame(() => {
      box.style.width = `${newWidth}px`;

      // Change the text content after the fade-out
      setTimeout(() => {
        boxText.innerText = language;
        fadeIn(boxText,"block",0.3);
      }, 150);
    });
  }
  changeBoxText();

  // Fading Out Placeholder
  placeholderText = document.querySelector(`.input-container.input${currentBoxId} .text-input`);
  fadeOut(placeholderText,false);

  // Adjusting Placeholder Text
  const translationPromise = chatgptRequest(
    "gpt-3.5-turbo",
    "Strictly follow the format: Translation: {translation}",
    `Translate into ${language}: Enter text to translate`,
    key,
  );

  // Clearing Output Text
  clearOtherInput(activeInput);

  // Adjusting Language Label
  const languageLabel = document.querySelector(
  `.input-container.input${currentBoxId} .language-label`,
  );
  languageLabel.innerText = language;


  // Changing Flag
  const flagPromise = (flag.includes("http") || flag.includes(".svg")) ? Promise.resolve(flag) : getFlagUrl(flag);
  try {
    const [botMessage, flagSrc] = await Promise.all([translationPromise, flagPromise]);
  
    // Handle flag image
    flagImg.src = flagSrc;
    fadeIn(flagImg, "block", 0.32);

    // Changing placeholder text
    sleep(0.5);
    const translationMatch = botMessage.match(/Translation:\s*(.*)/);
    if (translationMatch) {
      const translation = translationMatch[1] + "..";
      placeholderText.setAttribute("data-placeholder", translation);
      fadeIn(placeholderText);
    } else {
      console.error("Placeholder translation not found.");
    }
  
  } catch (error) {
    console.error('Error updating placeholder or flag:', error);
  }
}



// TRANSLATION FUNCTION //

async function translateText() {

  // Switching If Input Doesn't Have Text
  const activeInputBox = document.getElementById(`text-input${activeInput}`)?.textContent || '';
  const outputBoxContent = document.getElementById(`text-input${outputBox}`)?.textContent || '';
  if (!activeInputBox && outputBoxContent) {
    setActiveInput(outputBox);
  }
  
  // Getting Translation Language + Text to Translate
  let translatefrom = document.querySelector(`.input${activeInput} .language-label`).textContent;
  let translateto = document.querySelector(`.input${outputBox} .language-label`).textContent;
  const text = document.getElementById(`text-input${activeInput}`).textContent;
  const outputElement = document.getElementById(`text-input${outputBox}`);


  // Loading Animation
  outputElement.innerHTML = '<div class="loader-wrapper"><div class="pulsing-circle"></div></div>';
  fadeIn(outputElement.firstChild);


  // Choosing Model
  let model = "gpt-3.5-turbo";

  // Check if the text length is less than 20 and the language is translatable
  if (easyTranslates.includes(translateto) && text.length < 20) {
      model = "gpt-3.5-turbo";
  } else if (text.length < 201) {
      model = "gpt-4"; // Uses more intelligent model
  }

  // Checking Text Length
  let add_pronounce = text.length <= 60; // add if less than 60 letters 



  // If the input box is empty
  if (!text.trim()) {
    return; // Exit the function early
  }
  

  // System prompt
  let translateprompt_system = "You are a highly accurate translator, rendering phrases just as a local would say them, capturing specific cultural nuances. Respond strictly in this format: Translation: {translation}"

  if (translatefrom === "Detect Language") {
    translateprompt_system += " Detected: {detected_language}"
  }


  // Split text into paragraphs
  const paragraphs = text.split(/\n+/);
  const translationPromises = paragraphs.map(async (paragraph) => {

    // Split the paragraph into sentences
    const sentences = paragraph.match(/[^.!?]+[.!?]*\s*/g) || [paragraph];
    const sentencePromises = sentences.map(async (s) => {

      // User prompt
      let translateprompt_user = `Output the ${translateto} equivalent of '${s.trim()}' (${translatefrom}). If you can't translate, return the user input as the translation.`;
      if (add_pronounce === true) {
        // translateprompt_user += " For non-latin scripts, provide the transliteration in $[]$ format.";
        // translateprompt_system += " $[{non-latin-pronunciation}]$";
      }
      const botMessage = await chatgptRequest(
        model, 
        translateprompt_system, 
        translateprompt_user, 
        key
      );
      console.log(botMessage);

      // Extract the translation part
      let translation = botMessage.split("Translation:")[1].trim().replace("$[]$","");

      if (translatefrom === "Detect Language") {
        split = translation.split("Detected:")
        translation = split[0];
        selectLanguage(split[1]);
      }

      // Transliteration for non-latin scripts
      const transliterationMatch = botMessage.match(/\$\[(.*?)\]\$/);
      let translation_t = translation;

      if (transliterationMatch && transliterationMatch[1]) {
        let transliteration = transliterationMatch[1];
        translation_t = translation.split("$[")[0].trim();
      }
      
      return translation_t + " ";
    });

    const translatedSentences = await Promise.all(sentencePromises);
    return translatedSentences.join("");
  });
  const translatedParagraphs = await Promise.all(translationPromises);
  // Join paragraphs
  const translation_text = translatedParagraphs.join("\n\n").trim();


  // Remove single quotes if present
  if (translation_text.startsWith("'") && translation_text.endsWith("'")) {
    translation_text = translation_text.slice(1, -1);
  }


  // Display Text
  outputElement.innerHTML = translation_text;
  fadeIn(outputElement);

  
  // Adjusting font size
  adjustFontSizeOfInputs();


  // Adding TTS
  clearAudio();
  const textInput2 = document.getElementById("text-input2").innerHTML;
  try {
    addTTS(textInput2, translateto);
  } catch (error) {
    console.error("Cannot Create Audio File:", error);
  }

  // Adding Pronunciation
  // switching if needed
  let pronounceBox = outputBox;
  let pronounce_text = translation_text;
  if (translateto.includes("English")) {
    // Switch to other box
    pronounceBox = activeInput;
    pronounce_text = document.getElementById(`text-input${activeInput}`).innerHTML;
  }
  // getting chatgpt output + adding
  if (add_pronounce === true) {
    // Getting Pronunciation
    const botMessage = await chatgptRequest(
      "gpt-3.5-turbo",
      "Respond strictly in this format: Pronounce: [{simple phonetic pronunciation}]", 
      `Give a dialect-accurate phonetic pronunciation for: '${pronounce_text}' (${translatefrom}) in ${translateto}. Provide it in a way that is easy to read and understand, avoiding IPA. Make sure to include specific dialect nuances. Use hyphens to separate syllables.`,
      key
    );
    let pronounce = botMessage.split("Pronounce:")[1]?.trim();
    // Adding Pronunciation Box
    if (pronounce) {
      // Remove any existing brackets
      pronounce = pronounce.replace(/[[\]{}]/g, '').trim();
      pronounce = `[${pronounce}]`;
      addPronounce(pronounce, pronounceBox);
    }
  }
  let pronounceLang = document.querySelector(`.input-container.input${pronounceBox} .language-label`).textContent;


  // Adding More Info
  // checking text length
  let add_more_info = true;
  let text_len = document.getElementById(`text-input${pronounceBox}`).textContent.length;
  if (text_len > 20) {
    add_more_info = false;
  }
  clearMoreInfo();
  if (add_more_info === true) {

    // Adding More Info Button
    await sleep(0.7);
    const button = document.createElement('button');
    button.className = 'more-info-button';
    button.innerHTML = '<span>MORE INFO</span>';
    button. style.opacity = '0'; // Set initial opacity for fade-in
    const wrapperElement = document.querySelector('.wrapper');
    if (wrapperElement) {
      wrapperElement.appendChild(button);
      fadeIn(button);
    }

    // Handling button click
    button.addEventListener('click', () => moreInfo(pronounce_text, translateto, pronounceBox));
  }
}

const translateButton = document.querySelector(".translate-button");
let cooldown = false;
translateButton.addEventListener("click", function() {
  if (!cooldown) {
    translateText(); // Call the translate function

    // Set the cooldown
    cooldown = true;
    translateButton.disabled = true; // Optionally disable the button

    // Reset the cooldown after the specified time
    setTimeout(() => {
      cooldown = false;
      translateButton.disabled = false; // Re-enable the button
    }, cooldownTime);
  }
});



// SPEECH-TO-TEXT (STT) //

let mediaRecorder;
let stream;
let isRecording = false;
let audioChunks = [];

async function startRecording(recordingBox) {

  // Setting active input + changing icon
  setActiveInput(recordingBox);
  const recordButton = document.getElementById(`recordButton${recordingBox}`);
  const inputElement = document.getElementById(`text-input${recordingBox}`);
  recordButton.src = "icons/stop.svg";

  // Changing placeholder to Listening..
  inputElement.innerHTML = ""; // clears text
  adjustFontSizeOfInputs();
  const stored_placeholder = inputElement.getAttribute('data-placeholder');
  inputElement.setAttribute('data-placeholder', 'Listening..');
  inputElement.setAttribute('contenteditable', 'false');
  inputElement.classList.add('listening-placeholder');

  try {
    // Request access to the user's microphone
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Create a MediaRecorder instance to record audio
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = []; // Initialize/reset audioChunks array to store recorded audio data
  
    // Start recording
    mediaRecorder.start();
    isRecording = true;
    // Event listener to store audio data chunks when available
    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });
  
    // Event listener to handle the stop recording event
    mediaRecorder.addEventListener("stop", async () => {

      // Create a Blob from the recorded audio chunks
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  
      // Prepare the form data to send to the API
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.webm");
      formData.append("model", "whisper-1");
  
      try {
        // Send the recorded audio to the transcription API
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          body: formData,
        });
  
        // Check if the response is OK
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }
  
        // Parse the response JSON
        const result = await response.json();

        // Restore the placeholder
        inputElement.setAttribute('contenteditable', 'true');
        inputElement.classList.remove('listening-placeholder');
        inputElement.setAttribute('data-placeholder', stored_placeholder); // Or reset to the original placeholder
  
        // Update the text input
        document.getElementById(`text-input${recordingBox}`).innerText = result.text;
        clearOtherInput(recordingBox);
  
        // Translate the transcribed text
        translateText();
  
      } catch (error) {
        // Handle any errors that occur during the fetch operation
        console.error("Error during the fetch operation:", error);
      } finally {
        // Cleanup after stopping the recording
        isRecording = false;
        audioChunks = []; // Reset the audio chunks array
        recordButton.src = "icons/microphone.svg";
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      }
    });
  
    // Optional: Automatically stop recording after a specified time (e.g., 10 seconds)
    setTimeout(() => {
      if (isRecording) {
        stopRecording(recordingBox);
      }
    }, 10000); // 10 seconds timeout
  
  } catch (error) {
    // Handle any errors that occur when accessing media devices
    console.error("Error accessing media devices:", error);
    recordButton.src = "icons/microphone.svg"; // Reset button if there's an error
  }
  
  
}

function stopRecording(recordingBox) {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    const recordButton = document.getElementById(`recordButton${recordingBox}`);
    recordButton.src = "icons/microphone.svg";
    // Stop all tracks to release the microphone
    stream.getTracks().forEach((track) => track.stop());
  }
}

function toggleRecording(recordingBox) {
  if (isRecording) {
    stopRecording(recordingBox);
  } else {
    startRecording(recordingBox);
  }
}

// Export function to make it accessible in HTML
window.toggleRecording = toggleRecording;



// TEXT-TO-SPEECH (TTS) //

let addPlaybackSpeed = false;
async function addTTS(inputText, language) {
  // Choosing correct voice
  for (let lang in langVoices) {
    if (getLanguage(2).toLowerCase().includes(lang)) {
      selectedVoice = langVoices[lang];
      break;
    }
  }

  if (addPlaybackSpeed === true) {
    // Playback Speed Slider
    const speedSlider = document.createElement("input");
    const range = 0.28
    speedSlider.type = "range";
    speedSlider.min = 1-range;
    speedSlider.max = 1+range;
    speedSlider.step = range;
    speedSlider.value = "1";
    speedSlider.classList.add("speed-slider");

    const sliderLabel = document.createElement("label");
    sliderLabel.textContent = "Playback:";
    sliderLabel.classList.add("slider-label");

    // Create a container for the label and slider
    const sliderContainer = document.createElement("div");
    sliderContainer.classList.add("slider-container");

    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(speedSlider);

    const container = document.querySelector(".input-wrapper");
    console.log(container);
    container.insertBefore(sliderContainer, container.firstChild);
  }


  // ChatGPT TTS
  const TTSText = `[${language}] ${inputText}`
  const selectedModel = "tts-1";
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      voice: selectedVoice,
      input: TTSText,
      format: "mp3",
    }),
  });

  const data = await response.blob();
  const audioUrl = URL.createObjectURL(data);
  const audioPlayer = document.getElementById("audioPlayer");
  audioPlayer.src = audioUrl;

  if (addPlaybackSpeed === true) {
    // Add event listener to update playback speed
    speedSlider.addEventListener("input", () => {
      audioPlayer.playbackRate = speedSlider.value;
    });
  }

  const playButton = document.getElementById("playButton");
  playButton.style.opacity = 1;
  playButton.style.cursor = "pointer";
}




// SETTINGS PAGE //

const voiceLinks = {
  alloy: new Audio('https://www.dropbox.com/scl/fi/381pg6cejvp8shhzom4fi/alloy.mp3?rlkey=wooqhfjepcqi9na6zf474ft8l&st=kbq7ymtv&dl=1'),
  echo: new Audio('https://www.dropbox.com/scl/fi/3kzyxo040zrru5depoqqf/echo.mp3?rlkey=ku3i0w015mqv77uynl16opxp9&st=2lwvrurc&dl=1'),
  fable: new Audio('https://www.dropbox.com/scl/fi/559t2ej2ydb6i9skp0ndm/fable.mp3?rlkey=cgpeu5mh0xvmnd3djkobv2exj&st=evabqqkk&dl=1'),
  nova: new Audio('https://www.dropbox.com/scl/fi/ng2bdd99uqo3ypdsxjvak/nova.mp3?rlkey=5qf7mf31xh7htg10tukwlfjia&st=xnvimknc&dl=1'),
  onyx: new Audio('https://www.dropbox.com/scl/fi/bho179u14dzctjwn3pje0/onyx.mp3?rlkey=uffxlnz1mn2asc5wwjcsqh42j&st=duo39rz2&dl=1'),
  shimmer: new Audio('https://www.dropbox.com/scl/fi/gumt2xg7wi5olluiyig3h/shimmer.mp3?rlkey=rfbl001ndx0g93fup8pq94ujo&st=ahxwp0eg&dl=1')
};

// When "Choose Voice" is Clicked
function showVoiceOptions() {
  document.querySelector('.settings-main').style.display = 'none';
  document.querySelector('.choose-voice').style.display = 'block';
  highlightVoice(selectedVoice); // Highlight voice only after showing the voice options
}

// When "Back" is Clicked
function showSettings() {
  document.querySelector('.choose-voice').style.display = 'none';
  document.querySelector('.settings-main').style.display = 'block';
}

// When Voice Selected
function selectVoice(voice) {
  highlightVoice(voice);
  selectedVoice = voice; // Update the global variable
  setTimeout(() => {
    playVoiceSound(voice);
  }, 350); // milisecond delay
}

// Play the appropriate sound
function playVoiceSound(voice) {
  const audio = voiceLinks[voice];
  audio.currentTime = 0; // Reset playback position to the beginning
  audio.play().catch(error => console.error(`Error playing sound: ${error.message}`));
}

// Highlighting Voice
function highlightVoice(voice) {
  const items = document.querySelectorAll('.settings-container.choose-voice .settings-item');
  items.forEach(item => {
    item.classList.remove('selected');
  });
  const selectedItem = document.querySelector(`.settings-container.choose-voice .settings-item[data-voice="${voice}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
}