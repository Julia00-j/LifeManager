
"use strict";

// ELEMENTS
const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const priorityInput = document.getElementById("taskPriority");
const dateInput = document.getElementById("taskDate");
const timeInput = document.getElementById("taskTime");

const columns = {
  high: document.getElementById("highTasks"),
  medium: document.getElementById("mediumTasks"),
  low: document.getElementById("lowTasks")
};

const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const notesList = document.getElementById("notesList");

const agendaDate = document.getElementById("agendaDate");
const agendaList = document.getElementById("agendaList");

// CHARGEMENT
function loadArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erreur de lecture :", key, error);
    return [];
  }
}

let tasks = loadArray("tasks");
let notes = loadArray("notes");

function saveTasks() {
  try {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  } catch (error) {
    console.error(error);
    alert("Impossible de sauvegarder les tâches.");
  }
}

function saveNotes() {
  try {
    localStorage.setItem("notes", JSON.stringify(notes));
  } catch (error) {
    console.error(error);
    alert("Impossible de sauvegarder les notes.");
  }
}

// NAVIGATION
function showPage(page) {
  ["tasks", "notes", "agenda"].forEach(name => {
    document.getElementById(name + "Page").hidden =
      name !== page;
  });

  if (page === "agenda") renderAgenda();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

showPage("tasks");

// DATES
function formatDate(value) {
  if (!value) return "";

  const [day, time] = value.split("T");
  const [year, month, date] = day.split("-");

  return `${date}/${month}/${year}` +
    (time ? ` à ${time}` : "");
}

function isOverdue(task) {
  if (!task.dueDate || task.done) return false;

  const value = task.dueDate.includes("T")
    ? task.dueDate
    : task.dueDate + "T23:59:59";

  const deadline = new Date(value);

  return !isNaN(deadline.getTime()) &&
    deadline.getTime() < Date.now();
}

// AFFICHAGE DES TÂCHES
function renderTasks() {
  Object.values(columns).forEach(column => {
    column.replaceChildren();
  });

  const remaining = tasks.filter(t => !t.done).length;

  document.getElementById("taskCounter").textContent =
    `${remaining} tâche(s) restante(s) sur ${tasks.length}`;

  const sortedTasks = [...tasks].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) {
      return a.done ? 1 : -1;
    }

    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;

    return (a.dueDate || "").localeCompare(b.dueDate || "");
  });

  sortedTasks.forEach(task => {
    const priority = ["high", "medium", "low"]
      .includes(task.priority)
      ? task.priority
      : "medium";

    const li = document.createElement("li");
    li.className = "task-card";
    li.draggable = true;

    if (task.done) li.classList.add("done");

    li.addEventListener("dragstart", event => {
      event.dataTransfer.setData(
        "text/plain",
        String(task.id)
      );
      event.dataTransfer.effectAllowed = "move";
    });

    const top = document.createElement("div");
    top.className = "task-top";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const title = document.createElement("span");
    title.textContent = task.title;

    top.append(checkbox, title);
    li.appendChild(top);

    if (task.dueDate) {
      const date = document.createElement("small");
      date.className = "task-date";

      date.textContent = isOverdue(task)
        ? "⚠️ En retard : " + formatDate(task.dueDate)
        : "📅 " + formatDate(task.dueDate);

      if (isOverdue(task)) {
        date.classList.add("overdue");
      }

      li.appendChild(date);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const edit = document.createElement("button");
    edit.textContent = "Modifier";

    edit.addEventListener("click", () => {
      const result = prompt("Modifier la tâche :", task.title);

      if (result === null) return;

      const newTitle = result.trim();

      if (!newTitle) {
        alert("Le titre ne peut pas être vide.");
        return;
      }

      task.title = newTitle;
      saveTasks();
      renderTasks();
    });

    const remove = document.createElement("button");
    remove.textContent = "Supprimer";

    remove.addEventListener("click", () => {
      if (!confirm("Supprimer cette tâche ?")) return;

      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
      renderAgenda();
    });

    actions.append(edit, remove);
    li.appendChild(actions);
    columns[priority].appendChild(li);
  });
}

// AJOUTER UNE TÂCHE
form.addEventListener("submit", event => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  tasks.push({
    id: crypto.randomUUID(),
    title,
    done: false,
    priority: priorityInput.value,
    dueDate: dateInput.value
      ? dateInput.value +
        (timeInput.value ? "T" + timeInput.value : "")
      : null
  });

  saveTasks();
  renderTasks();

  form.reset();
  input.focus();
});

// DEPLACEMENT ENTRE COLONNES
document.querySelectorAll(".column").forEach(column => {
  column.addEventListener("dragover", event => {
    event.preventDefault();
  });

  column.addEventListener("drop", event => {
    event.preventDefault();

    const id = event.dataTransfer.getData("text/plain");
    const task = tasks.find(t => String(t.id) === id);

    if (!task) return;

    task.priority = column.dataset.priority;

    saveTasks();
    renderTasks();
  });
});

// NOTES
function renderNotes() {
  notesList.replaceChildren();

  notes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const content = document.createElement("p");
    content.textContent = note.content;

    const edit = document.createElement("button");
    edit.textContent = "Modifier";

    edit.addEventListener("click", () => {
      const newTitle = prompt("Titre :", note.title);
      if (newTitle === null || !newTitle.trim()) return;

      const newContent = prompt("Contenu :", note.content);
      if (newContent === null) return;

      note.title = newTitle.trim();
      note.content = newContent;

      saveNotes();
      renderNotes();
    });

    const remove = document.createElement("button");
    remove.textContent = "Supprimer";

    remove.addEventListener("click", () => {
      if (!confirm("Supprimer cette note ?")) return;

      notes = notes.filter(n => n.id !== note.id);
      saveNotes();
      renderNotes();
    });

    card.append(title, content, edit, remove);
    notesList.appendChild(card);
  });
}

noteForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = noteTitle.value.trim();
  if (!title) return;

  notes.push({
    id: crypto.randomUUID(),
    title,
    content: noteContent.value
  });

  saveNotes();
  renderNotes();
  noteForm.reset();
});

// AGENDA
const today = new Date();
const localToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().slice(0, 10);

agendaDate.value = localToday;


function renderAgenda() {
  agendaList.replaceChildren();

  const selectedDate = agendaDate.value;

  const dayTasks = tasks.filter(task =>
    task.dueDate &&
    task.dueDate.slice(0, 10) === selectedDate
  );

  // Créer un bloc pour une tâche
  function createAgendaTask(task) {
    const item = document.createElement("div");
    item.className = "agenda-task";

    const priority = {
      high: "🔴",
      medium: "🟠",
      low: "🟢"
    };

    const icon = priority[task.priority] || "🟠";

    const title = document.createElement("span");

    const time = task.dueDate.includes("T")
      ? task.dueDate.split("T")[1]
      : "";

    title.textContent =
      icon + " " + (time ? time + " — " : "") + task.title;

    if (task.done) {
      title.style.textDecoration = "line-through";
      title.style.opacity = "0.6";
    }

    item.appendChild(title);
    return item;
  }

  // Tâches sans heure : en haut
  const allDay = document.createElement("div");
  allDay.className = "agenda-all-day";

  const allDayTitle = document.createElement("h3");
  allDayTitle.textContent = "📌 Toute la journée";

  allDay.appendChild(allDayTitle);

  const allDayTasks = dayTasks.filter(
    task => !task.dueDate.includes("T")
  );

  if (allDayTasks.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Aucune tâche pour toute la journée.";
    allDay.appendChild(empty);
  } else {
    allDayTasks.forEach(task => {
      allDay.appendChild(createAgendaTask(task));
    });
  }

  agendaList.appendChild(allDay);

  // Créer les 24 lignes horaires
  for (let hour = 0; hour < 24; hour++) {
    const row = document.createElement("div");
    row.className = "agenda-hour";

    const label = document.createElement("div");
    label.className = "agenda-hour-label";
    label.textContent =
      String(hour).padStart(2, "0") + ":00";

    const content = document.createElement("div");
    content.className = "agenda-hour-content";

    const hourTasks = dayTasks
      .filter(task => {
        if (!task.dueDate.includes("T")) return false;

        const taskHour = Number(
          task.dueDate.split("T")[1].split(":")[0]
        );

        return taskHour === hour;
      })
      .sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate)
      );

    hourTasks.forEach(task => {
      content.appendChild(createAgendaTask(task));
    });

    row.append(label, content);
    agendaList.appendChild(row);
  }
}

agendaDate.addEventListener("change", renderAgenda);

// DEMARRAGE
renderTasks();
renderNotes();
renderAgenda();

// Actualiser les indicateurs de retard
setInterval(renderTasks, 60000);
