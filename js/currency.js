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

// Attach event listeners to both currency input fields
document.querySelectorAll(".currency-input").forEach((input, index) => {
  input.addEventListener("input", () => convertCurrency(input, index === 0));
});

// Fetch exchange rates when the page loads
document.addEventListener("DOMContentLoaded", updateExchangeRates);




// Opening Overlay when clicked
document.getElementById("currency-box1").addEventListener("click", function () {
  currentBox = "box1";
  openOverlay();
});
document.getElementById("currency-box2").addEventListener("click", function () {
  currentBox = "box2";
  openOverlay();
});
function openOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.display = "flex";
  overlay.style.opacity = 0;
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10); // Small delay to allow the display change to take effect
  document.querySelector('.langchoice-input input[type="text"]').focus();
}
function closeOverlay() {
  const overlay = document.getElementById("currency-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.style.display = "none";
  }, 300); // Match the delay to the CSS transition duration (300ms)
}


// DOC FULLY LOADED
document.addEventListener("DOMContentLoaded", () => {


  // Confirm Button Opacity
  const input = document.getElementById("currency-input");
  const confirm = document.getElementById("currency-confirm");

  if (input && confirm) {
    input.addEventListener("input", () => {
      confirm.style.opacity = input.value.trim() ? 0.8 : 0.4;
      confirm.style.cursor = input.value.trim() ? "pointer" : "default";
    });
  }



});