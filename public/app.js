const activitySelect = document.getElementById("activity-select");
const form = document.getElementById("volunteer-form");
const message = document.getElementById("form-message");

const setMessage = (text, type = "info") => {
  message.textContent = text;
  message.className = `message ${type}`;
};

const loadActivities = async () => {
  activitySelect.innerHTML = "";
  try {
    const res = await fetch("/api/activities");
    const data = await res.json();
    data.activities.forEach((activity) => {
      const option = document.createElement("option");
      option.value = activity.id;
      option.textContent = `${activity.name} (${activity.duration_minutes} 分钟)`;
      activitySelect.appendChild(option);
    });
  } catch (error) {
    setMessage("活动加载失败，请稍后再试。", "error");
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const employeeId = formData.get("employee_id").trim();
  const name = formData.get("name").trim();
  const submissionMode = formData.get("submission_mode") || "reset";
  const activityIds = Array.from(activitySelect.selectedOptions).map((option) => Number(option.value));

  if (!employeeId || !name || activityIds.length === 0) {
    setMessage("请完整填写信息并选择至少一个活动。", "error");
    return;
  }

  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId,
        name,
        activity_ids: activityIds,
        submission_mode: submissionMode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "提交失败，请稍后再试。", "error");
      return;
    }
    if (data.mode === "append") {
      setMessage("保留此前活动并更新当前选择（需管理员审核后计入统计）。", "success");
    } else {
      setMessage("重复提交会覆盖此前记录（需管理员审核后计入统计）。", "success");
    }
    form.reset();
  } catch (error) {
    setMessage("提交失败，请稍后再试。", "error");
  }
});

loadActivities();
