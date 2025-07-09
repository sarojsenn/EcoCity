// Unsplash Slideshow Logic
const accessKey = '-6nvFYpIqC98SfTPG04X2fAEPNehv6dg-G1DWkHA2PU'; // Replace with your Unsplash API key
const queries = ['smart recycle bin', 'eco city', 'sustainability'];
let allImages = [];
let currentSlide = 0;

async function fetchImages(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&client_id=${accessKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results.map(img => img.urls.regular);
  } catch (err) {
    console.error(`Failed to fetch for "${query}"`, err);
    return [];
  }
}

async function initSlideshow() {
  const slideshow = document.getElementById('slideshow');
  const dots = document.querySelectorAll('.dot');
  const results = await Promise.all(queries.map(fetchImages));
  allImages = results.flat();
  if (allImages.length === 0) {
    console.error("No images to show in slideshow.");
    return;
  }
  function updateSlide(index) {
    slideshow.style.backgroundImage = `url('${allImages[index]}')`;
    dots.forEach((dot, i) => {
      dot.style.opacity = i === index ? '1' : '0.5';
    });
  }
  updateSlide(currentSlide);
  setInterval(() => {
    currentSlide = (currentSlide + 1) % allImages.length;
    updateSlide(currentSlide);
  }, 5000);
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      currentSlide = i;
      updateSlide(i);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
  // Try auto-login if token exists
  if (localStorage.getItem('token')) {
    loadDashboardAndRewards();
  }
});

// Show modal when "Login" is clicked
document.querySelectorAll('a').forEach(a => {
  if (a.textContent.includes('Login')) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('authModal').classList.remove('hidden');
      document.getElementById('loginForm').classList.remove('hidden');
      document.getElementById('signupForm').classList.add('hidden');
    });
  }
});

// Close modal
document.getElementById('closeAuthModal').onclick = () => {
  document.getElementById('authModal').classList.add('hidden');
};

// Switch to signup form
document.getElementById('showSignup').onclick = (e) => {
  e.preventDefault();
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('signupForm').classList.remove('hidden');
};

// Switch to login form
document.getElementById('showLogin').onclick = (e) => {
  e.preventDefault();
  document.getElementById('signupForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
};

// ====================== OTP Registration Logic ======================

// Send OTP handler
document.getElementById('sendOtpBtn').onclick = async function() {
  const email = document.getElementById('signupEmail').value;
  const errorDiv = document.getElementById('signupError');
  errorDiv.classList.add('hidden');
  if (!email) {
    errorDiv.textContent = 'Please enter your email first';
    errorDiv.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      alert('OTP sent to your email!');
    } else {
      errorDiv.textContent = data.message || 'Failed to send OTP';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

// Signup with OTP
document.getElementById('signupForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const otp = document.getElementById('signupOtp').value;
  const errorDiv = document.getElementById('signupError');
  errorDiv.classList.add('hidden');
  if (!otp) {
    errorDiv.textContent = 'Please enter the OTP sent to your email';
    errorDiv.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otp })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('signupForm').classList.add('hidden');
      document.getElementById('loginForm').classList.remove('hidden');
      alert('Registration successful! Please login.');
    } else {
      errorDiv.textContent = data.message || 'Signup failed';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

// ====================== END OTP Registration Logic ==================

// Handle login (EMAIL & PASSWORD)
document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.classList.add('hidden');
  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      document.getElementById('authModal').classList.add('hidden');
      loadDashboardAndRewards();
    } else {
      errorDiv.textContent = data.message || 'Login failed';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

// Load dashboard and rewards data using JWT token
async function loadDashboardAndRewards() {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Fetch dashboard data
  try {
    const dashRes = await fetch('http://localhost:3000/api/dashboard', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const dashData = await dashRes.json();
    document.getElementById('smartBins').textContent = dashData.smartBins ?? '--';
    document.getElementById('wasteCollected').textContent = dashData.wasteCollected !== undefined ? dashData.wasteCollected + ' kg' : '--';
    document.getElementById('recyclingRate').textContent = dashData.recyclingRate !== undefined ? dashData.recyclingRate + '%' : '--';
    document.getElementById('ecoVolunteers').textContent = dashData.ecoVolunteers ?? '--';
  } catch (e) {
    console.error('Dashboard data error:', e);
  }

  // Fetch rewards data
  try {
    const rewardRes = await fetch('http://localhost:3000/api/rewards', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const rewardData = await rewardRes.json();
    document.getElementById('userName').textContent = rewardData.userName ?? '';
    document.getElementById('rewardPoints').textContent = rewardData.rewardPoints ?? '0';
  } catch (e) {
    console.error('Rewards data error:', e);
  }
}
// Send OTP handler (already present)
document.getElementById('sendOtpBtn').onclick = async function() {
  const email = document.getElementById('signupEmail').value;
  const errorDiv = document.getElementById('signupError');
  const otpStatus = document.getElementById('otpStatus');
  errorDiv.classList.add('hidden');
  otpStatus.textContent = '';
  if (!email) {
    errorDiv.textContent = 'Please enter your email first';
    errorDiv.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      otpStatus.textContent = 'OTP sent to your email!';
      otpStatus.className = 'text-green-600 text-sm mt-1';
    } else {
      errorDiv.textContent = data.message || 'Failed to send OTP';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

// Verify OTP handler
document.getElementById('verifyOtpBtn').onclick = async function() {
  const email = document.getElementById('signupEmail').value;
  const otp = document.getElementById('signupOtp').value;
  const otpStatus = document.getElementById('otpStatus');
  const errorDiv = document.getElementById('signupError');
  errorDiv.classList.add('hidden');
  otpStatus.textContent = '';
  if (!email || !otp) {
    otpStatus.textContent = 'Please enter your email and OTP.';
    otpStatus.className = 'text-red-500 text-sm mt-1';
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    if (res.ok) {
      otpStatus.textContent = 'OTP verified! You can now sign up.';
      otpStatus.className = 'text-green-600 text-sm mt-1';
      document.getElementById('signupSubmitBtn').disabled = false;
    } else {
      otpStatus.textContent = data.message || 'OTP verification failed';
      otpStatus.className = 'text-red-500 text-sm mt-1';
      document.getElementById('signupSubmitBtn').disabled = true;
    }
  } catch (err) {
    otpStatus.textContent = 'Network error';
    otpStatus.className = 'text-red-500 text-sm mt-1';
    document.getElementById('signupSubmitBtn').disabled = true;
  }
};

// Signup with OTP (only after verification)
document.getElementById('signupForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const otp = document.getElementById('signupOtp').value;
  const errorDiv = document.getElementById('signupError');
  errorDiv.classList.add('hidden');
  if (!otp) {
    errorDiv.textContent = 'Please enter and verify the OTP sent to your email';
    errorDiv.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otp })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('signupForm').classList.add('hidden');
      document.getElementById('loginForm').classList.remove('hidden');
      alert('Registration successful! Please login.');
      document.getElementById('signupSubmitBtn').disabled = true;
    } else {
      errorDiv.textContent = data.message || 'Signup failed';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

document.getElementById('downloadBtn').onclick = function() {
  generateCertificate();
};

function generateCertificate() {
  // Get user info
  const userName = document.getElementById('userName').textContent || "EcoCity User";
  const rewardPoints = document.getElementById('rewardPoints').textContent || "0";

  // Prepare canvas
  const canvas = document.getElementById('certificate');
  const ctx = canvas.getContext('2d');
  canvas.classList.remove('hidden');

  // Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e6ffed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.font = "bold 32px serif";
  ctx.fillStyle = "#16a34a";
  ctx.textAlign = "center";
  ctx.fillText("Certificate of Contribution", canvas.width / 2, 70);

  // Subtitle
  ctx.font = "20px serif";
  ctx.fillStyle = "#333";
  ctx.fillText("Awarded to", canvas.width / 2, 120);

  // User Name
  ctx.font = "bold 28px Quicksand, serif";
  ctx.fillStyle = "#111";
  ctx.fillText(userName, canvas.width / 2, 170);

  // Message
  ctx.font = "18px serif";
  ctx.fillStyle = "#444";
  ctx.fillText(`For earning ${rewardPoints} Eco Points`, canvas.width / 2, 220);

  // Footer
  ctx.font = "16px serif";
  ctx.fillStyle = "#666";
  ctx.fillText("EcoCity Smart Waste Management", canvas.width / 2, 320);

  // Date
  const today = new Date();
  ctx.font = "14px serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`Date: ${today.toLocaleDateString()}`, canvas.width / 2, 360);

  // Download as image
  const link = document.createElement('a');
  link.download = `EcoCity_Certificate_${userName.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  // Optionally hide the canvas again
  setTimeout(() => {
    canvas.classList.add('hidden');
  }, 1000);
}
// Show/hide logout button based on authentication
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const logoutBtn = document.getElementById('logoutBtn');
  if (token) {
    logoutBtn.classList.remove('hidden');
  } else {
    logoutBtn.classList.add('hidden');
  }
}

// Call this after login and logout
function handleLoginSuccess() {
  document.getElementById('authModal').classList.add('hidden');
  loadDashboardAndRewards();
  updateAuthUI();
}

// Logout functionality
document.getElementById('logoutBtn').onclick = function() {
  localStorage.removeItem('token');
  // Optionally clear dashboard/rewards UI
  document.getElementById('userName').textContent = 'User';
  document.getElementById('rewardPoints').textContent = '0';
  document.getElementById('smartBins').textContent = '--';
  document.getElementById('wasteCollected').textContent = '--';
  document.getElementById('recyclingRate').textContent = '--';
  document.getElementById('ecoVolunteers').textContent = '--';
  updateAuthUI();
  // Show login modal
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
};

// Adjust your login handler to use handleLoginSuccess
document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.classList.add('hidden');
  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      handleLoginSuccess();
    } else {
      errorDiv.textContent = data.message || 'Login failed';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Network error';
    errorDiv.classList.remove('hidden');
  }
};

// On page load, update logout button visibility
window.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
  if (localStorage.getItem('token')) {
    loadDashboardAndRewards();
  }
  updateAuthUI();
});

