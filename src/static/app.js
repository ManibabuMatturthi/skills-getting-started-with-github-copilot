document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Inject simple styles to make cards and participants list pretty
  const style = document.createElement("style");
  style.textContent = `
    .activity-card {
      border: 1px solid #e6e6e6;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 12px;
      background: linear-gradient(180deg,#ffffff,#fbfbfb);
      box-shadow: 0 1px 3px rgba(16,24,40,0.04);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    .activity-card h4 { margin: 0 0 6px 0; color: #111827; }
    .activity-card p { margin: 6px 0; color: #374151; font-size: 14px; }
    .participants-section { margin-top: 10px; }
    .participants-list { margin: 6px 0 0 0; padding: 0; color: #374151; list-style: none; }
    .participants-list li { margin: 6px 0; display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: 6px; }
    .participants-list li.muted { color: #9ca3af; font-style: italic; }
    .participant-email { overflow-wrap: anywhere; }
    .remove-btn { margin-left: 8px; background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
    .remove-btn:hover { background: rgba(239,68,68,0.08); }
  `;
  document.head.appendChild(style);

  // escape helper to avoid XSS when inserting participant names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message / previous list
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicate options on re-fetch
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            <div class="participants-container"></div>
          </div>
        `;

        // Build participants list using DOM methods to keep data attributes raw
        const container = activityCard.querySelector(".participants-container");
        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "remove-btn";
            btn.type = "button";
            btn.setAttribute("aria-label", `Unregister ${p}`);
            btn.textContent = "✖";
            // store raw values in dataset for accurate requests
            btn.dataset.activity = name;
            btn.dataset.email = p;

            btn.addEventListener("click", async () => {
              if (!confirm(`Unregister ${p} from ${name}?`)) return;

              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                const body = await res.json();
                if (res.ok) {
                  messageDiv.textContent = body.message || "Unregistered";
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");
                  // Refresh activities list
                  await fetchActivities();
                } else {
                  messageDiv.textContent = body.detail || "Failed to unregister";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                }

                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              } catch (err) {
                console.error("Error unregistering:", err);
                messageDiv.textContent = "Failed to unregister. Try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "muted";
          li.textContent = "No participants yet — be the first!";
          ul.appendChild(li);
        }

        container.appendChild(ul);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
