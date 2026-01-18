const loginCard = document.getElementById("login-card");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");
const passwordInput = document.getElementById("admin-password");

const statVolunteers = document.getElementById("stat-volunteers");
const statParticipations = document.getElementById("stat-participations");
const statMinutes = document.getElementById("stat-minutes");
const chartCanvas = document.getElementById("stats-chart");

const userStatusFilter = document.getElementById("user-status-filter");
const usersTableBody = document.querySelector("#users-table tbody");

const activityForm = document.getElementById("activity-form");
const activitiesTableBody = document.querySelector("#activities-table tbody");

const submissionStatusFilter = document.getElementById("submission-status-filter");
const refreshSubmissionsBtn = document.getElementById("refresh-submissions");
const exportCsvBtn = document.getElementById("export-csv");
const resetDataBtn = document.getElementById("reset-data");
const submissionsTableBody = document.querySelector("#submissions-table tbody");

const perPersonTableBody = document.querySelector("#per-person-table tbody");

let statsChart = null;

const authHeaders = () => ({
  "X-Admin-Password": sessionStorage.getItem("adminPassword") || "",
});

const fetchJson = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  if (options.body && !headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem("adminPassword");
    loginMessage.textContent = "登录失效，请重新登录。";
    dashboard.hidden = true;
    loginCard.hidden = false;
    throw new Error("unauthorized");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
};

const ensureLoggedIn = async () => {
  const password = sessionStorage.getItem("adminPassword");
  if (!password) return;
  loginCard.hidden = true;
  dashboard.hidden = false;
  await refreshAll();
};

const renderStats = async () => {
  const data = await fetchJson("/api/stats");
  statVolunteers.textContent = data.totals.volunteers;
  statParticipations.textContent = data.totals.participations;
  statMinutes.textContent = data.totals.minutes;

  const labels = data.perPerson.map((item) => `${item.employee_id}`);
  const values = data.perPerson.map((item) => item.total_minutes);

  if (statsChart) statsChart.destroy();
  statsChart = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "累计时长(分钟)",
          data: values,
          backgroundColor: "rgba(79, 70, 229, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  perPersonTableBody.innerHTML = data.perPerson
    .map(
      (item) => `
      <tr>
        <td>${item.employee_id}</td>
        <td>${item.name}</td>
        <td>${item.total_minutes}</td>
      </tr>
    `
    )
    .join("");
};

const loadUsers = async (status) => {
  return fetchJson(`/api/users?status=${status}`);
};

const approveUser = async (employeeId) => {
  await fetchJson(`/api/users/${encodeURIComponent(employeeId)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "approved" }),
  });
};

const rejectUser = async (employeeId) => {
  await fetchJson(`/api/users/${encodeURIComponent(employeeId)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "rejected" }),
  });
};

const renderUsers = async () => {
  const status = userStatusFilter.value;
  const data = await loadUsers(status);
  usersTableBody.innerHTML = data.users
    .map((user) => {
      const actions = status === "pending"
        ? `<button class="btn" data-action="approve" data-id="${user.employee_id}">批准</button>
           <button class="btn danger" data-action="reject" data-id="${user.employee_id}">驳回</button>`
        : `<span class="badge ${user.status}">${user.status}</span>`;
      return `
        <tr>
          <td>${user.employee_id}</td>
          <td>${user.name}</td>
          <td>${user.created_at || ""}</td>
          <td>${user.submissions_count ?? 0}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join("");
};

const renderActivities = async () => {
  const data = await fetchJson("/api/activities", { headers: authHeaders() });
  activitiesTableBody.innerHTML = data.activities
    .map(
      (activity) => `
      <tr>
        <td>${activity.id}</td>
        <td><input type="text" value="${activity.name}" data-field="name" data-id="${activity.id}" /></td>
        <td><input type="number" value="${activity.duration_minutes}" data-field="duration_minutes" data-id="${activity.id}" /></td>
        <td>
          <button class="btn" data-action="save" data-id="${activity.id}">保存</button>
          <button class="btn danger" data-action="delete" data-id="${activity.id}">删除</button>
        </td>
      </tr>
    `
    )
    .join("");
};

const renderSubmissions = async () => {
  const status = submissionStatusFilter.value;
  const data = await fetchJson(`/api/submissions?status=${status}`);
  submissionsTableBody.innerHTML = data.submissions
    .map(
      (item) => `
      <tr>
        <td>${item.employee_id}</td>
        <td>${item.user_name}</td>
        <td><span class="badge ${item.user_status}">${item.user_status}</span></td>
        <td>${item.activity_name}</td>
        <td>${item.duration_minutes}</td>
        <td>${item.updated_at || item.created_at || ""}</td>
        <td><button class="btn danger" data-action="delete" data-id="${item.submission_id}">删除</button></td>
      </tr>
    `
    )
    .join("");

  return data.submissions;
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const exportCsv = async () => {
  const status = submissionStatusFilter.value;
  const data = await fetchJson(`/api/submissions?status=${status}`);
  const headers = ["工号", "姓名", "志愿者活动", "时间(分钟)", "用户状态", "更新时间"];
  const rows = data.submissions.map((item) => [
    item.employee_id,
    item.user_name,
    item.activity_name,
    item.duration_minutes,
    item.user_status,
    item.updated_at || item.created_at || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "submissions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const refreshAll = async () => {
  await Promise.all([renderStats(), renderUsers(), renderActivities(), renderSubmissions()]);
};

loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value.trim();
  if (!password) {
    loginMessage.textContent = "请输入密码。";
    return;
  }
  sessionStorage.setItem("adminPassword", password);
  loginMessage.textContent = "";
  loginCard.hidden = true;
  dashboard.hidden = false;
  try {
    await refreshAll();
  } catch (error) {
    loginMessage.textContent = "登录失败，请检查密码。";
    loginCard.hidden = false;
    dashboard.hidden = true;
  }
});

userStatusFilter.addEventListener("change", () => {
  renderUsers();
});

usersTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;
  if (action === "approve") {
    await approveUser(id);
  }
  if (action === "reject") {
    await rejectUser(id);
  }
  await Promise.all([renderUsers(), renderStats(), renderSubmissions()]);
});

activityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(activityForm);
  const name = formData.get("name").trim();
  const duration = Number(formData.get("duration_minutes"));
  if (!name || !Number.isInteger(duration) || duration <= 0) return;
  await fetchJson("/api/activities", {
    method: "POST",
    body: JSON.stringify({ name, duration_minutes: duration }),
  });
  activityForm.reset();
  await renderActivities();
});

activitiesTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;
  if (action === "delete") {
    await fetchJson(`/api/activities/${id}`, { method: "DELETE" });
  }
  if (action === "save") {
    const row = target.closest("tr");
    const nameInput = row.querySelector("input[data-field='name']");
    const durationInput = row.querySelector("input[data-field='duration_minutes']");
    const payload = {
      name: nameInput.value.trim(),
      duration_minutes: Number(durationInput.value),
    };
    await fetchJson(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }
  await renderActivities();
  await Promise.all([renderSubmissions(), renderStats()]);
});

refreshSubmissionsBtn.addEventListener("click", () => {
  renderSubmissions();
});

submissionStatusFilter.addEventListener("change", () => {
  renderSubmissions();
});

submissionsTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;
  if (action === "delete") {
    await fetchJson(`/api/submissions/${id}`, { method: "DELETE" });
    await Promise.all([renderSubmissions(), renderStats()]);
  }
});

exportCsvBtn.addEventListener("click", () => {
  exportCsv();
});

resetDataBtn.addEventListener("click", async () => {
  if (!confirm("确认清空所有数据？")) return;
  await fetchJson("/api/reset", { method: "POST" });
  await refreshAll();
});

ensureLoggedIn();
