// API endpoint — update after AWS deployment
const API_BASE = 'https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com';

// Form toggle
const toggles = document.querySelectorAll('.toggle');
const forms = document.querySelectorAll('.form');

toggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    const target = toggle.dataset.form;

    toggles.forEach(t => t.classList.remove('active'));
    toggle.classList.add('active');

    forms.forEach(form => {
      form.classList.remove('active');
      if (form.dataset.type === target) {
        form.classList.add('active');
      }
    });

    document.getElementById('success').classList.add('hidden');
  });
});

// Form submission
forms.forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('.submit');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const formData = new FormData(form);
    const data = {
      type: form.dataset.type,
      timestamp: new Date().toISOString(),
      _hp: formData.get('_hp') || '',
      data: {}
    };

    formData.forEach((value, key) => {
      if (key === '_hp') return;
      if (value.trim()) {
        data.data[key] = value.trim();
      }
    });

    try {
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed');

      form.classList.remove('active');
      document.getElementById('success').classList.remove('hidden');
      form.reset();

    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
});
