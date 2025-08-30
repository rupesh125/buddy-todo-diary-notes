// ========== AUTH ==========
document.getElementById("googleLogin").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("app").style.display = "block";
    document.getElementById("googleLogin").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
    loadTodos();
    loadDiaryDates();
    loadBooks();
  } else {
    document.getElementById("app").style.display = "none";
    document.getElementById("googleLogin").style.display = "inline-block";
    document.getElementById("logoutBtn").style.display = "none";
  }
});

// ========== TODO ==========
function addTodo() {
  let task = document.getElementById("todoInput").value;
  if (!task) return;
  db.collection("todos").add({ 
    task, done: false, uid: auth.currentUser.uid 
  });
  document.getElementById("todoInput").value = "";
}

function loadTodos() {
  db.collection("todos")
    .where("uid", "==", auth.currentUser.uid)
    .onSnapshot(snapshot => {
      let activeList = document.getElementById("activeTodos");
      let completedList = document.getElementById("completedTodos");
      activeList.innerHTML = "";
      completedList.innerHTML = "";
      snapshot.forEach(doc => {
        let li = document.createElement("li");
        li.textContent = doc.data().task;
        li.onclick = () => toggleDone(doc.id, doc.data().done);
        if (doc.data().done) {
          completedList.appendChild(li);
        } else {
          activeList.appendChild(li);
        }
      });
    });
}

function toggleDone(id, done) {
  db.collection("todos").doc(id).update({ done: !done });
}

// ========== DIARY ==========
function saveDiaryEntry() {
  let text = document.getElementById("diaryText").value;
  let date = new Date().toISOString().split("T")[0];
  db.collection("diary").doc(auth.currentUser.uid + "_" + date).set({
    uid: auth.currentUser.uid,
    date,
    text
  });
}

function loadDiaryDates() {
  db.collection("diary")
    .where("uid", "==", auth.currentUser.uid)
    .onSnapshot(snapshot => {
      let select = document.getElementById("diaryDate");
      select.innerHTML = "";
      snapshot.forEach(doc => {
        let option = document.createElement("option");
        option.value = doc.data().date;
        option.textContent = doc.data().date;
        select.appendChild(option);
      });
      if (select.value) loadDiaryEntry();
    });
}

function loadDiaryEntry() {
  let date = document.getElementById("diaryDate").value;
  if (!date) return;
  db.collection("diary").doc(auth.currentUser.uid + "_" + date).get().then(doc => {
    if (doc.exists) {
      document.getElementById("diaryText").value = doc.data().text;
    } else {
      document.getElementById("diaryText").value = "";
    }
  });
}

// ========== NOTES ==========
let currentBookId = null;
let currentChapter = null;

function toggleSidebar() {
  let sidebar = document.getElementById("bookSidebar");
  sidebar.style.display = sidebar.style.display === "none" ? "block" : "none";
}

function addBook() {
  let name = document.getElementById("bookInput").value;
  if (!name) return;
  db.collection("books").add({ uid: auth.currentUser.uid, name });
  document.getElementById("bookInput").value = "";
}

function loadBooks() {
  db.collection("books")
    .where("uid", "==", auth.currentUser.uid)
    .onSnapshot(snapshot => {
      let bookList = document.getElementById("bookList");
      bookList.innerHTML = "";
      snapshot.forEach(doc => {
        let li = document.createElement("li");
        li.textContent = doc.data().name;
        li.onclick = () => selectBook(doc.id, doc.data().name);
        bookList.appendChild(li);
      });
    });
}

function selectBook(bookId, name) {
  currentBookId = bookId;
  document.getElementById("currentBook").textContent = name;
  loadChapters();
}

function addChapter() {
  if (!currentBookId) return alert("Select a book first!");
  let name = document.getElementById("chapterInput").value;
  if (!name) return;
  db.collection("chapters").add({ uid: auth.currentUser.uid, bookId: currentBookId, name });
  document.getElementById("chapterInput").value = "";
}

function loadChapters() {
  db.collection("chapters")
    .where("uid", "==", auth.currentUser.uid)
    .where("bookId", "==", currentBookId)
    .onSnapshot(snapshot => {
      let chapterList = document.getElementById("chapterList");
      chapterList.innerHTML = "";
      snapshot.forEach(doc => {
        let li = document.createElement("li");
        li.textContent = doc.data().name;
        li.onclick = () => selectChapter(doc.id, doc.data().name);
        chapterList.appendChild(li);
      });
    });
}

function selectChapter(chapterId, name) {
  currentChapter = chapterId;
  document.getElementById("noteText").value = "";
  db.collection("notes")
    .where("uid", "==", auth.currentUser.uid)
    .where("chapterId", "==", chapterId)
    .limit(1)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        document.getElementById("noteText").value = doc.data().text;
      });
    });
}

function saveNote() {
  if (!currentChapter) return alert("Select a chapter first!");
  db.collection("notes").doc(auth.currentUser.uid + "_" + currentChapter).set({
    uid: auth.currentUser.uid,
    chapterId: currentChapter,
    text: document.getElementById("no
