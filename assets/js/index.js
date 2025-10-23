/*
  Local Auth system (client-side)
  - Stores users in localStorage under key "bikexp_users_v1" as array
  - Stores logged in username under "bikexp_logged_in"
  - Passwords & recovery PINs hashed using SHA-256 via Web Crypto
  - Each user gets a personal dataKey = "bikexp_data_<username>"
*/

const USERS_KEY = 'bikexp_users_v1';
const LOGIN_KEY = 'bikexp_logged_in';
const hasCryptoRandom = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
const hasSubtleCrypto = typeof crypto !== 'undefined' && crypto?.subtle && typeof crypto.subtle.digest === 'function';
let hashFallbackWarned = false;

function uid(){ return 'u_' + cryptoRandom(8); }
function cryptoRandom(len=8){
  if (hasCryptoRandom) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(n => n.toString(16).padStart(2,'0')).join('').slice(0,len);
  }
  console.warn('Secure random generator unavailable; using Math.random fallback.');
  let out = '';
  while(out.length < len){
    out += Math.floor(Math.random()*16).toString(16);
  }
  return out.slice(0,len);
}

function warnHashFallback(){
  if(!hashFallbackWarned){
    hashFallbackWarned = true;
    showAlert('Secure hashing not supported here. Running in compatibility mode; use HTTPS for best security.', 'warning', 4200);
  }
}

// hash text (utf-8 -> SHA-256 -> hex)
async function hashText(text){
  if (hasSubtleCrypto) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(text);
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map(b=>b.toString(16).padStart(2,'0')).join('');
    } catch (err) {
      console.warn('Web Crypto digest failed, falling back:', err);
    }
  }
  if (typeof sha256 === 'function') {
    warnHashFallback();
    return sha256(text);
  }
  warnHashFallback();
  return text;
}

// users helpers
function loadUsers(){
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function findUser(username){
  const users = loadUsers();
  return users.find(u => u.username === username.toLowerCase());
}

// show simple bootstrap alert (toast style)
function showAlert(msg, type='success', timeout=3000){
  const iconMap = { success:'success', danger:'error', warning:'warning', info:'info' };
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast:true,
      icon: iconMap[type] || 'info',
      title: msg,
      position:'top-end',
      showConfirmButton:false,
      timer: timeout,
      timerProgressBar:true,
      customClass:{ popup:'swal2-toast' },
      didOpen: toast => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    return;
  }
  // Bootstrap fallback if SweetAlert2 is unavailable
  const el = document.createElement('div');
  el.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3 shadow`;
  el.style.zIndex = 9999;
  el.innerText = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('fade'), 20);
  setTimeout(()=> el.classList.remove('show'), timeout);
  setTimeout(()=> el.remove(), timeout+500);
}

// Signup handler
document.getElementById('signupForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const full = document.getElementById('signupFull').value.trim();
  const username = document.getElementById('signupUser').value.trim().toLowerCase();
  const pass = document.getElementById('signupPass').value;
  const pin = document.getElementById('signupPin').value.trim();

  if(!/^\d{4}$/.test(pin)){ showAlert('Recovery PIN must be 4 digits','danger'); return; }
  if(findUser(username)){ showAlert('Username already taken','danger'); return; }

  const passHash = await hashText(pass);
  const pinHash = await hashText(pin);

  const newUser = {
    id: uid(),
    username,
    displayName: full || username,
    passwordHash: passHash,
    recoveryHash: pinHash,
    createdAt: new Date().toISOString(),
    dataKey: `bikexp_data_${username}`
  };

  const users = loadUsers();
  users.push(newUser);
  saveUsers(users);

  // create empty data for user (optional)
  localStorage.setItem(newUser.dataKey, JSON.stringify({entries:[]}));

  // auto-login after signup
  localStorage.setItem(LOGIN_KEY, username);
  showAlert('Account created — redirecting to dashboard', 'success', 1500);
  setTimeout(()=> location.href = 'dashboard.html', 1000);
});

// Login handler
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  const user = findUser(username);
  if(!user){ showAlert('User not found','danger'); return; }
  const passHash = await hashText(pass);
  if(passHash !== user.passwordHash){ showAlert('Wrong password','danger'); return; }
  localStorage.setItem(LOGIN_KEY, username);
  showAlert('Login successful — redirecting', 'success', 1000);
  setTimeout(()=> location.href = 'dashboard.html', 700);
});

// Forgot password modal
const forgotModal = new bootstrap.Modal(document.getElementById('forgotModal'));
document.getElementById('openForgot').addEventListener('click',(e)=>{ e.preventDefault(); forgotModal.show(); });

document.getElementById('forgotForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const uname = document.getElementById('forgotUser').value.trim().toLowerCase();
  const pin = document.getElementById('forgotPin').value.trim();
  const newPass = document.getElementById('forgotNewPass').value;

  const msg = document.getElementById('forgotMsg');
  msg.classList.remove('d-none','alert-success','alert-danger');

  const user = findUser(uname);
  if(!user){ msg.classList.add('alert-danger'); msg.innerText = 'User not found'; return; }

  if(!/^\d{4}$/.test(pin)){ msg.classList.add('alert-danger'); msg.innerText = 'PIN must be 4 digits'; return; }

  const pinHash = await hashText(pin);
  if(pinHash !== user.recoveryHash){ msg.classList.add('alert-danger'); msg.innerText = 'Recovery PIN incorrect'; return; }

  // set new password
  const newHash = await hashText(newPass);
  const users = loadUsers();
  const idx = users.findIndex(u=>u.username===uname);
  users[idx].passwordHash = newHash;
  saveUsers(users);

  msg.classList.add('alert-success');
  msg.innerText = 'Password updated. You can now login with your new password.';
  showAlert('Password updated. You can now login with your new password.','success',2200);
  setTimeout(()=> {
    forgotModal.hide();
    document.getElementById('forgotForm').reset();
    msg.classList.add('d-none');
    msg.innerText = '';
  }, 1200);
});

// If already logged in -> go to dashboard
(function checkAutoRedirect(){
  const logged = localStorage.getItem(LOGIN_KEY);
  if(logged) {
    // If user arrived at index but already logged in, redirect to dashboard
    // (this ensures clicking signup/login when already logged in skips)
    setTimeout(()=> location.href = 'dashboard.html', 400);
  }
})();
