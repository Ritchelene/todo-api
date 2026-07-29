const CONFIG = {
  BASE_URL: 'https://apitest.enricodelarosa.tech',
  TOKEN: 'c5babade4aa6b3dc4440b5a6e4da97ce016187ae0f597aace124da323ad3571a'
};

const elements = {
  form: document.getElementById('todo-form'),
  input: document.getElementById('todo-input'),
  list: document.getElementById('todo-list'),
  healthBadge: document.getElementById('health-badge'),
  healthText: document.getElementById('health-text'),
  toast: document.getElementById('toast')
};

// Helper: Display floating toast notifications
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

// Helper: Unified fetch handler for API calls
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (!options.isPublic) {
    headers['Authorization'] = `Bearer ${CONFIG.TOKEN}`;
  }

  try {
    const response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    // 204 No Content (e.g. DELETE success)
    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}: Action failed`);
    }

    return data;
  } catch (err) {
    showToast(err.message);
    throw err;
  }
}

// Check API Health Status
async function checkHealth() {
  try {
    const res = await apiRequest('/health', { isPublic: true });
    if (res && res.ok) {
      elements.healthBadge.className = 'status-badge online';
      elements.healthText.textContent = 'API Online';
    } else {
      throw new Error();
    }
  } catch {
    elements.healthBadge.className = 'status-badge offline';
    elements.healthText.textContent = 'API Offline';
  }
}

// Load and render all Todos
async function fetchTodos() {
  try {
    const todos = await apiRequest('/todos');
    renderTodos(todos);
  } catch (err) {
    elements.list.innerHTML = `<div class="empty-state">Failed to load tasks.</div>`;
  }
}

// Render Todos UI
function renderTodos(todos) {
  if (!todos || todos.length === 0) {
    elements.list.innerHTML = `<div class="empty-state">No tasks available. Add one above!</div>`;
    return;
  }

  elements.list.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.id = todo.id;

    li.innerHTML = `
      <div class="todo-content">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? 'checked' : ''} 
          onchange="toggleTodo(${todo.id}, this.checked)"
        />
        <span class="todo-title ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.title)}</span>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" onclick="enableEdit(${todo.id}, '${escapeHtml(todo.title)}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteTodo(${todo.id})">Delete</button>
      </div>
    `;
    elements.list.appendChild(li);
  });
}

// Add New Todo
elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = elements.input.value.trim();
  if (!title) return;

  try {
    await apiRequest('/todos', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    elements.input.value = '';
    fetchTodos();
  } catch (err) {}
});

// Toggle Completed Status
async function toggleTodo(id, completed) {
  try {
    await apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed })
    });
    fetchTodos();
  } catch (err) {
    fetchTodos(); // Reset UI state on failure
  }
}

// Enable Inline Edit
function enableEdit(id, currentTitle) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (!item) return;

  item.innerHTML = `
    <div class="todo-content">
      <input type="text" class="edit-input" value="${currentTitle}" id="edit-input-${id}" />
    </div>
    <div class="actions">
      <button class="btn" onclick="saveEdit(${id})">Save</button>
      <button class="btn btn-secondary" onclick="fetchTodos()">Cancel</button>
    </div>
  `;

  const input = document.getElementById(`edit-input-${id}`);
  input.focus();
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') saveEdit(id);
    if (e.key === 'Escape') fetchTodos();
  });
}

// Save Edited Title
async function saveEdit(id) {
  const input = document.getElementById(`edit-input-${id}`);
  const newTitle = input.value.trim();

  if (!newTitle) {
    showToast("Title cannot be empty");
    return;
  }

  try {
    await apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: newTitle })
    });
    fetchTodos();
  } catch (err) {}
}

// Delete Todo
async function deleteTodo(id) {
  try {
    await apiRequest(`/todos/${id}`, {
      method: 'DELETE'
    });
    fetchTodos();
  } catch (err) {}
}

// Sanitize string helper
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

// Initial Load
checkHealth();
fetchTodos();