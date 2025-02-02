// ===============================
//      EXCHANGE RATE FETCHING
// ===============================

const fetchExchangeRate = async (from, to) => {
  try {
    console.log(`Fetching rate: ${from} → ${to}`);
    const { rates } = await (await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)).json();
    if (rates?.[to]) {
      console.log(`1 ${from} = ${rates[to]} ${to}`);
      return rates[to];
    }
    console.warn(`Rate missing: ${from} → ${to}`);
    return null;
  } catch (e) {
    console.error(`Error fetching rate (${from} → ${to}):`, e);
    return null;
  }
};

// Stores exchange rate from box1 → box2
let exchangeRate = 1;

// Converts "(£) GBP" -> "GBP"
const extractCurrencyCode = (formattedCurrency) => formattedCurrency.replace(/\(.*?\)\s*/g, "").trim();

// ===============================
//      CURRENCY CONVERSION & FORMATTING
// ===============================

const convertCurrency = (modifiedBox) => {
  const input = document.getElementById(`currency-input${modifiedBox}`);
  const output = document.getElementById(`currency-input${modifiedBox === 1 ? 2 : 1}`);

  let rawValue = input.value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters
  if (rawValue.includes(".")) rawValue = rawValue.split(".")[0] + "." + rawValue.split(".")[1].slice(0, 2); // Limit to 2 decimals

  let num = parseFloat(rawValue);
  const format = (n) => {
    let formatted = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return formatted.includes(".") ? parseFloat(n.toFixed(2)).toLocaleString() : formatted; // Ensure commas + decimals when needed
  };

  input.value = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Format input with commas
  output.value = isNaN(num) ? "" : exchangeRate ? format(modifiedBox === 1 ? num * exchangeRate : num / exchangeRate) : "N/A"; // Convert & format output
};

// Keypad Function

let activeCurrencyInput = document.getElementById("currency-input1"); // Default to input 1
// Track last focused input
document.querySelectorAll(".currency-input").forEach(input => 
  input.addEventListener("focus", () => activeCurrencyInput = input)
);
// Handle keypad clicks
document.querySelector(".keypad").addEventListener("click", (e) => {
  if (!activeCurrencyInput || !e.target.matches("button")) return;
  let value = e.target.textContent;
  if (value === "⌫") activeCurrencyInput.value = activeCurrencyInput.value.slice(0, -1);
  else activeCurrencyInput.value += value;
  // Manually trigger input event to update currency conversion
  activeCurrencyInput.dispatchEvent(new Event("input"));
});


// ===============================
//      OVERLAY HANDLING
// ===============================

function openCurrencyOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.display = "flex";
  overlay.style.opacity = "0";
  setTimeout(() => (overlay.style.opacity = "1"), 10);
  document.getElementById("currency-input").focus();
}

function closeCurrencyOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => (overlay.style.display = "none"), 300);
}

let currentCurrencyBox = null; // Declares global variable
// Opens overlay when either box clicked
document.getElementById("currency-box1").addEventListener("click", () => {
  document.getElementById("currency-input").value = ''; // clears input
  currentCurrencyBox = '1'
  openCurrencyOverlay();
});
document.getElementById("currency-box2").addEventListener("click", () => {
  document.getElementById("currency-input").value = '';
  currentCurrencyBox = '2'
  openCurrencyOverlay();
});

// ===============================
//      DOCUMENT READY EVENTS
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
  // Input changes
  document.getElementById("currency-input1")?.addEventListener("input", () => convertCurrency(1));
  document.getElementById("currency-input2")?.addEventListener("input", () => convertCurrency(2));

  // Fetch initial exchange rate (Always box1 → box2)
  const box1Code = extractCurrencyCode(document.getElementById("currency-box1").querySelector(".box-text").textContent);
  const box2Code = extractCurrencyCode(document.getElementById("currency-box2").querySelector(".box-text").textContent);
  exchangeRate = (await fetchExchangeRate(box1Code, box2Code)) || 1;

  // Confirm button opacity
  const currencyInput = document.getElementById("currency-input");
  const currencyConfirm = document.getElementById("currency-confirm");
  if (currencyInput && currencyConfirm) {
    currencyInput.addEventListener("input", () => {
      const hasText = currencyInput.value.trim() !== "";
      currencyConfirm.style.opacity = hasText ? "0.8" : "0.4";
      currencyConfirm.style.cursor = hasText ? "pointer" : "default";
    });
  }
});

// ===============================
//      CONFIRM CURRENCY SELECTION
// ===============================

async function confirmCurrencySelection() {
  
  // Gets user's inputted currency
  const input = document.getElementById("currency-input").value.trim().toUpperCase();
  if (!input) return;

  // Check if currency in files
  const currencies = await (await fetch("js/currency-symbols.json")).json();
  const entry = currencies.find(c => c.abbreviation === input);
  if (!entry) return errorShake(document.getElementById("currency-confirm")); // not found, exit function
  const currencyAbbreviation = entry.abbreviation;
  const currencySymbol = decodeHtmlEntities(entry.symbol);

  // Update box value
  document.querySelectorAll(`.currency-symbol${currentCurrencyBox}`)
    .forEach(el => {
      console.log(el);
      el.textContent = currencySymbol;
      el.classList.toggle("italic", /[A-Za-z]/.test(currencySymbol)); // Italicize if contains letters
    });
  document.getElementById(`currency-text-${currentCurrencyBox}`).textContent = currencyAbbreviation; // set currency text

  // Update exchange rate
  exchangeRate = (await fetchExchangeRate(
    extractCurrencyCode(document.getElementById("currency-box1").querySelector(".box-text").textContent),
    extractCurrencyCode(document.getElementById("currency-box2").querySelector(".box-text").textContent)
  )) || 1;

  closeCurrencyOverlay();

  // Find & update flag
  const box = document.getElementById(`currency-box${currentCurrencyBox}`);
  let nameParts = entry.currency.split(" "); // split into words, removing 1 each time
  while (nameParts.pop() && !(box.querySelector(".flag img").src = await getFlagUrl(nameParts.join(" ")))) {}

  // Convert
  convertCurrency(currentCurrencyBox);
}

// Decode currency symbols
function decodeHtmlEntities(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value.replace(/\(([\p{L}\s]+)\)/gu, (_, letters) => `(<i>${letters}</i>)`); // Italicize letters
}