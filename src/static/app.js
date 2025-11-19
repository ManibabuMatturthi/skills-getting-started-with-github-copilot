document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Small helper to avoid injecting raw HTML from server-provided strings
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicates on re-fetch
      activitySelect.innerHTML = `<option value="">Select an activity</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section: bulleted list or placeholder
        const participantsHtml =
          details.participants && details.participants.length
            ? `<ul class="participants-list" style="margin:6px 0 0 18px; padding:0; color:#333; line-height:1.35;">${details.participants
                .map((p) => `<li style="margin:2px 0;">${escapeHtml(p)}</li>`)
                .join("")}</ul>`
            : `<p class="no-participants" style="margin:6px 0 0 0; color:#666; font-style:italic;">No participants yet — be the first!</p>`;

        activityCard.innerHTML = `
          <h4 style="margin:0 0 6px 0;">${escapeHtml(name)}</h4>
          <p style="margin:0 0 6px 0; color:#444;">${escapeHtml(details.description)}</p>
          <p style="margin:0 0 6px 0; color:#444;"><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p style="margin:0 0 8px 0; color:#222;"><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section" style="background:#fafafa; border-radius:6px; padding:8px 10px; border:1px solid #eee;">
            <strong style="display:block; margin-bottom:6px; color:#333;">Participants</strong>
            ${participantsHtml}
          </div>
        `;

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
