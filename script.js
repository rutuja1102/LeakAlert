// Initialize map 
const map = L.map("map").setView([20.5937, 78.9629], 5); // India
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Load reports
let reports = JSON.parse(localStorage.getItem("reports")) || [];

// Chart.js setup
let chart;
function updateChart() {
  const categories = { "Pipe Burst": 0, "Tap Leak": 0, "Drainage Overflow": 0 };

  reports.forEach(r => {
    if (r.category) categories[r.category]++;
  });

  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (chart) chart.destroy(); // reset
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ["#007bff", "#28a745", "#ffc107"]
      }]
    }
  });
}

// Display reports
function displayReports() {
  const reportList = document.getElementById("reports");
  reportList.innerHTML = "";
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  let total = reports.length;
  let todayCount = 0;
  const todayDate = new Date().toLocaleDateString();

  reports.forEach((report) => {
    if (new Date(report.timestamp).toLocaleDateString() === todayDate) {
      todayCount++;
    }

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${report.location}</strong> - <em>${report.category}</em><br>
      <small>${new Date(report.timestamp).toLocaleString()}</small><br>
      ${report.description}
      ${report.image ? `<br><img src="${report.image}" width="100" style="margin-top:5px; border-radius:6px;">` : ""}
    `;
    reportList.appendChild(li);

    if (report.coords) {
      L.marker([report.coords.lat, report.coords.lng])
        .addTo(map)
        .bindPopup(`
          <b>${report.location}</b><br>
          ${report.description}<br>
          <em>${report.category}</em><br>
          <small>${new Date(report.timestamp).toLocaleString()}</small>
          ${report.image ? `<br><img src="${report.image}" width="120" style="margin-top:5px; border-radius:6px;">` : ""}
        `);
    }
  });

  document.getElementById("totalReports").textContent = total;
  document.getElementById("todayReports").textContent = todayCount;

  updateChart();
}

// Save report
function saveReport(location, description, image, category, coordsOverride = null) {
  const timestamp = new Date().toISOString();

  if (coordsOverride) {
    finalizeSave(location, description, image, category, coordsOverride, timestamp);
    return;
  }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
    .then((res) => res.json())
    .then((data) => {
      let coords = null;
      if (data.length > 0) {
        coords = { lat: data[0].lat, lng: data[0].lon };
      }
      finalizeSave(location, description, image, category, coords, timestamp);
    })
    .catch(() => {
      finalizeSave(location, description, image, category, null, timestamp);
    });
}

function finalizeSave(location, description, image, category, coords, timestamp) {
  const newReport = { location, description, image, category, coords, timestamp };
  reports.push(newReport);
  localStorage.setItem("reports", JSON.stringify(reports));
  displayReports();
}

// Form submit
document.getElementById("leakForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const imageInput = document.getElementById("image").files[0];

  if (!location || !description || !category) {
    alert("Please fill out all fields.");
    return;
  }

  if (imageInput) {
    const reader = new FileReader();
    reader.onload = function (event) {
      saveReport(location, description, event.target.result, category);
    };
    reader.readAsDataURL(imageInput);
  } else {
    saveReport(location, description, null, category);
  }

  this.reset();
  document.getElementById("message").textContent = "✅ Report submitted successfully!";
  setTimeout(() => { document.getElementById("message").textContent = ""; }, 3000);
});

// Clear reports
document.getElementById("clearReports").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all reports?")) {
    reports = [];
    localStorage.removeItem("reports");
    displayReports();
  }
});

// Use current location
document.getElementById("useLocation").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      saveReport("Current Location", "Water leak spotted", null, "Pipe Burst", { lat: latitude, lng: longitude });
    }, () => {
      alert("Unable to fetch your location.");
    });
  } else {
    alert("Geolocation not supported.");
  }
});

// Dark mode toggle
document.getElementById("toggleDark").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Initial load
displayReports();
