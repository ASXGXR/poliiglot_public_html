// ===============================
//      EXCHANGE RATE FETCHING
// ===============================

// Fetch exchange rate from API
const fetchExchangeRate = async (from, to) => {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const data = await res.json();
    return data.rates[to] || null;
  } catch (e) {
    console.error("Error fetching exchange rate:", e);
    return null;
  }
};

// Global exchange rate storage
let exchangeRates = {};

// Fetch and store exchange rates
const updateExchangeRates = async () => {
  const inputs = document.querySelectorAll(".currency-input");
  const fromCurrency = inputs[0].dataset.currency;
  const toCurrency = inputs[1].dataset.currency;

  exchangeRates[fromCurrency] = {};
  exchangeRates[toCurrency] = {};

  // Fetch both conversion rates
  exchangeRates[fromCurrency][toCurrency] = await fetchExchangeRate(fromCurrency, toCurrency);
  exchangeRates[toCurrency][fromCurrency] = await fetchExchangeRate(toCurrency, fromCurrency);

  console.log("Exchange rates updated:", exchangeRates);
};

// ===============================
//      CURRENCY CONVERSION
// ===============================

// Convert currency between the two input fields
const convertCurrency = (input, isBase) => {
  const inputs = document.querySelectorAll(".currency-input");
  const fromInput = isBase ? inputs[0] : inputs[1]; // The field being typed into
  const toInput = isBase ? inputs[1] : inputs[0]; // The field to update
  const fromCurrency = fromInput.dataset.currency;
  const toCurrency = toInput.dataset.currency;
  let value = fromInput.value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters except '.'

  // Trim to 2 decimal places
  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts[1]?.length > 2) {
      value = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
  }

  fromInput.value = value;

  if (value === "" || isNaN(parseFloat(value))) {
    toInput.value = ""; // Clear the other field if the input is empty
  } else if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency]) {
    toInput.value = (parseFloat(value) * exchangeRates[fromCurrency][toCurrency]).toFixed(2);
  }
};

// Attach event listeners to currency input fields
document.querySelectorAll(".currency-input").forEach((input, index) => {
  input.addEventListener("input", () => convertCurrency(input, index === 0));
});

// ===============================
//      OVERLAY HANDLING
// ===============================

// Open currency selection overlay
function openCurrencyOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.display = "flex";
  overlay.style.opacity = "0";

  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10); // Small delay to allow the display change to take effect

  document.getElementById("currency-input").focus();
}

// Close currency selection overlay
function closeCurrencyOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.opacity = "0";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 300); // Match the delay to the CSS transition duration (300ms)
}

// Attach event listeners to open the overlay when clicked
document.getElementById("currency-box1").addEventListener("click", openCurrencyOverlay);
document.getElementById("currency-box2").addEventListener("click", openCurrencyOverlay);

// ===============================
//      DOCUMENT READY EVENTS
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  // Fetch exchange rates on load
  updateExchangeRates();

  // Confirm button opacity update
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