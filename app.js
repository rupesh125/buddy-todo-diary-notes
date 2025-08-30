
// Firebase config (use your config)
const firebaseConfig = {
  apiKey: "AIzaSyBh49v3-8sw_KVPZ4aHbiX8dI1Wkd4_hm8",
  authDomain: "buddy-todo-396ba.firebaseapp.com",
  projectId: "buddy-todo-396ba",
  storageBucket: "buddy-todo-396ba.firebasestorage.app",
  messagingSenderId: "829043889745",
  appId: "1:829043889745:web:7c162b2e7526424873ca70",
  measurementId: "G-8SMRMCXG9N"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI refs
const userArea = document.getElementById('userArea');
const signInBtn = document.getElementById('signInBtn');
const appRoot = document.getElementById('app');
const toastEl = document.getElementById('toast');

let currentUser = null;

// Auth
signInBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  if(user){
    userArea.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <img src="${user.photoURL}" style="width:32px;height:32px;border-radius:999px" alt="me"/>
      <div style="font-size:14px">${user.displayName}</div>
      <button id="signOut" class="btn">Sign out</button>
    </div>`;
    document.getElementById('signOut').addEventListener('click', ()=>auth.signOut());
    appRoot.setAttribute('aria-hidden','false');
    showToast('Signed in as '+user.displayName);
    initAfterAuth();
  } else {
    userArea.innerHTML = '<button id="signInBtn" class="btn">Sign in with Google</button>';
    document.getElementById('signInBtn').addEventListener('click', ()=>{
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider);
    });
    appRoot.setAttribute('aria-hidden','true');
  }
});

function showToast(msg, t=2500){
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(()=>toastEl.classList.add('hidden'), t);
}

// Tabs
document.querySelectorAll('.m-tab').forEach(b=>b.addEventListener('click', ()=>{
  document.querySelectorAll('.m-tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); document.getElementById(b.dataset.tab).classList.add('active');
  if(b.dataset.tab==='diary') buildCalendar();
  if(b.dataset.tab==='todo') loadTasks();
  if(b.dataset.tab==='notes') loadBooks();
}));

// To-Do modal + CRUD
const taskModal = document.getElementById('taskModal');
const mSave = document.getElementById('mSave');
const mCancel = document.getElementById('mCancel');
let editTaskId = null;

document.getElementById('btnOpenAdd').addEventListener('click', ()=>{ editTaskId=null; openModalFor(); });
mCancel.addEventListener('click', ()=> taskModal.classList.add('hidden'));
mSave.addEventListener('click', async ()=>{
  const title = document.getElementById('mTitle').value.trim();
  if(!title) return showToast('Title required');
  const payload = {
    title,
    date: document.getElementById('mDate').value || '',
    time: document.getElementById('mTime').value || '',
    type: document.getElementById('mType').value,
    priority: document.getElementById('mPriority').value,
    tags: (document.getElementById('mTags').value||'').split(',').map(s=>s.trim()).filter(Boolean),
    done: false,
    createdAt: new Date()
  };
  const path = `users/${currentUser.uid}/todos`;
  if(editTaskId){
    await db.collection(path).doc(editTaskId).update(payload);
    showToast('Task updated');
  } else {
    await db.collection(path).add(payload);
    showToast('Task added');
  }
  taskModal.classList.add('hidden');
  ['mTitle','mDate','mTime','mTags'].forEach(id=>document.getElementById(id).value='');
  loadTasks();
});

function openModalFor(task){
  if(task){
    editTaskId = task.id;
    document.getElementById('mTitle').value = task.title;
    document.getElementById('mDate').value = task.date || '';
    document.getElementById('mTime').value = task.time || '';
    document.getElementById('mType').value = task.type || 'daily';
    document.getElementById('mPriority').value = task.priority || 'Medium';
    document.getElementById('mTags').value = task.tags?.join(',')||'';
  } else {
    editTaskId = null;
    ['mTitle','mDate','mTime','mTags'].forEach(id=>document.getElementById(id).value='');
  }
  taskModal.classList.remove('hidden');
}

// load tasks
async function loadTasks(){
  if(!currentUser) return;
  const path = `users/${currentUser.uid}/todos`;
  const snap = await db.collection(path).orderBy('createdAt','desc').get();
  const active = document.getElementById('activeList'); const completed = document.getElementById('completedList');
  active.innerHTML=''; completed.innerHTML='';
  snap.forEach(doc=>{
    const t = doc.data(); t.id = doc.id;
    if(t.type !== (document.getElementById('btnDaily').classList.contains('active') ? 'daily' : 'additional')) return;
    const el = document.createElement('div'); el.className='taskCard';
    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:600">${escapeHtml(t.title)}</div><div class="badge">${t.date||''} ${t.time||''} • ${t.priority}</div>`;
    const right = document.createElement('div');
    const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit';
    editBtn.addEventListener('click', ()=> openModalFor(t));
    const doneBtn = document.createElement('button'); doneBtn.className='btn'; doneBtn.textContent = t.done? 'Undo' : 'Done';
    doneBtn.addEventListener('click', ()=> toggleDone(doc.id, t.done));
    const delBtn = document.createElement('button'); delBtn.className='btn'; delBtn.textContent='Delete';
    delBtn.addEventListener('click', ()=> deleteTask(doc.id));
    right.appendChild(editBtn); right.appendChild(doneBtn); right.appendChild(delBtn);
    el.appendChild(left); el.appendChild(right);
    if(t.done) completed.appendChild(el); else active.appendChild(el);
  });
}

async function toggleDone(id, cur){
  const path = `users/${currentUser.uid}/todos`;
  await db.collection(path).doc(id).update({ done: !cur });
  loadTasks();
}

async function deleteTask(id){
  if(!confirm('Delete task?')) return;
  const path = `users/${currentUser.uid}/todos`;
  await db.collection(path).doc(id).delete();
  loadTasks();
}

// diary: calendar + editor (no popup)
function buildCalendar(){
  const wrap = document.getElementById('calWrap'); wrap.innerHTML='';
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const start = first.getDay();
  const days = new Date(today.getFullYear(), today.getMonth()+1,0).getDate();
  const grid = document.createElement('div'); grid.className='calGrid';
  for(let i=0;i<start;i++){ const c=document.createElement('div'); c.className='calCell'; grid.appendChild(c); }
  for(let d=1; d<=days; d++){
    const c = document.createElement('div'); c.className='calCell'; c.textContent=d;
    const iso = new Date(first.getFullYear(), first.getMonth(), d).toISOString().split('T')[0];
    c.addEventListener('click', ()=>{ document.getElementById('diaryDate').value = iso; loadDiary(iso); document.querySelectorAll('.calCell').forEach(x=>x.classList.remove('active')); c.classList.add('active'); });
    grid.appendChild(c);
  }
  wrap.appendChild(grid);
  // set today
  const todayIso = new Date().toISOString().split('T')[0];
  document.getElementById('diaryDate').value = todayIso;
  loadDiary(todayIso);
}

async function loadDiary(dateIso){
  if(!currentUser) return;
  const path = `users/${currentUser.uid}/diary`;
  const snap = await db.collection(path).where('date','==',dateIso).orderBy('createdAt','desc').get();
  const editor = document.getElementById('diaryEditor');
  if(snap.empty){ editor.innerHTML = ''; } else {
    // show latest entry
    const d = snap.docs[0].data();
    editor.innerHTML = d.html || escapeHtml(d.text || '');
  }
}

document.getElementById('diarySave').addEventListener('click', async ()=>{
  if(!currentUser) return showToast('Sign in first');
  const dateIso = document.getElementById('diaryDate').value || new Date().toISOString().split('T')[0];
  const html = document.getElementById('diaryEditor').innerHTML;
  const path = `users/${currentUser.uid}/diary`;
  await db.collection(path).add({ date: dateIso, html, createdAt: new Date() });
  showToast('Diary saved');
  loadDiary(dateIso);
});

// diary toolbar
document.querySelectorAll('#diary .editor-toolbar button').forEach(b=> b.addEventListener('click', ()=> document.execCommand(b.dataset.cmd,false,null)));

// Notes (books -> chapters -> notes)
let currentBook = null;
let currentChapter = null;

document.getElementById('createBook').addEventListener('click', async ()=>{
  if(!currentUser) return showToast('Sign in first');
  const name = document.getElementById('newBookName').value.trim(); if(!name) return showToast('Name required');
  const ref = await db.collection(`users/${currentUser.uid}/books`).add({ name, createdAt: new Date() });
  document.getElementById('newBookName').value=''; loadBooks(); selectBook(ref.id);
});

async function loadBooks(){
  if(!currentUser) return;
  const snap = await db.collection(`users/${currentUser.uid}/books`).orderBy('createdAt','desc').get();
  const list = document.getElementById('booksList'); list.innerHTML='';
  snap.forEach(doc=>{
    const b = doc.data(); const el = document.createElement('div'); el.className='bookItem'; el.textContent = b.name;
    el.addEventListener('click', ()=> selectBook(doc.id));
    list.appendChild(el);
  });
}

async function selectBook(bookId){
  currentBook = bookId; currentChapter = null; loadChapters(bookId);
}

document.getElementById('createChapter').addEventListener('click', async ()=>{
  if(!currentUser) return showToast('Sign in first');
  if(!currentBook) return showToast('Select a book');
  const title = document.getElementById('newChapterTitle').value.trim(); if(!title) return showToast('Title required');
  const ref = await db.collection(`users/${currentUser.uid}/books`).doc(currentBook).collection('chapters').add({ title, createdAt: new Date() });
  document.getElementById('newChapterTitle').value=''; loadChapters(currentBook); selectChapter(ref.id);
});

async function loadChapters(bookId){
  const snap = await db.collection(`users/${currentUser.uid}/books`).doc(bookId).collection('chapters').orderBy('createdAt','desc').get();
  const list = document.getElementById('chaptersList'); list.innerHTML='';
  snap.forEach(doc=>{
    const c = doc.data(); const el = document.createElement('div'); el.className='taskCard'; el.textContent = c.title; el.addEventListener('click', ()=> selectChapter(doc.id));
    list.appendChild(el);
  });
}

async function selectChapter(chId){
  currentChapter = chId;
  // load last note into editor
  const snap = await db.collection(`users/${currentUser.uid}/books`).doc(currentBook).collection('chapters').doc(chId).collection('notes').orderBy('createdAt','desc').get();
  const editor = document.getElementById('noteEditor');
  editor.innerHTML = '';
  snap.forEach(doc=>{ const n = doc.data(); editor.innerHTML = n.html || n.text || editor.innerHTML; });
}

document.getElementById('saveNote').addEventListener('click', async ()=>{
  if(!currentUser) return showToast('Sign in first');
  if(!currentBook || !currentChapter) return showToast('Select book & chapter');
  const html = document.getElementById('noteEditor').innerHTML;
  await db.collection(`users/${currentUser.uid}/books`).doc(currentBook).collection('chapters').doc(currentChapter).collection('notes').add({ html, createdAt: new Date() });
  showToast('Note saved');
});

// helper
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }

// init after auth
function initAfterAuth(){
  buildCalendar(); loadTasks(); loadBooks();
  // seg control
  document.getElementById('btnDaily').addEventListener('click', ()=>{ document.getElementById('btnDaily').classList.add('active'); document.getElementById('btnAdditional').classList.remove('active'); loadTasks();});
  document.getElementById('btnAdditional').addEventListener('click', ()=>{ document.getElementById('btnAdditional').classList.add('active'); document.getElementById('btnDaily').classList.remove('active'); loadTasks();});
}

// start hidden app until sign-in
// end of file
