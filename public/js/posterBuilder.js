document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initial State
    const state = {
        template: 'modern',
        title: 'EVENT TITLE',
        sub_title: 'Inspiring the Future', // Default text
        hosted_by: 'Evently Corp',         // Default text
        date: '2026-10-24',
        venue: 'MAIN HALL',
        color: '#ef4444',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'
    };

    const container = document.getElementById('poster-preview-area');
    const templateInput = document.getElementById('selected-template-id');

    // 2. Render Function
    function renderPoster() {
        if (window.posterTemplates && window.posterTemplates[state.template]) {
            container.innerHTML = window.posterTemplates[state.template](state);
        }
    }

    // 3. Listen for Typing (Expanded List)
    // We mapped the HTML IDs to the State keys here
    const inputMap = {
        'input-title': 'title',
        'input-subtitle': 'sub_title',
        'input-hostedby': 'hosted_by',
        'input-venue': 'venue',
        'input-date': 'date'
    };

    Object.keys(inputMap).forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', (e) => {
                state[inputMap[id]] = e.target.value || inputMap[id].toUpperCase(); 
                renderPoster();
            });
        }
    });

    // 4. Color Listener
    const colorInput = document.getElementById('input-color');
    if(colorInput) {
        colorInput.addEventListener('input', (e) => {
            state.color = e.target.value;
            renderPoster();
        });
    }

    // 5. Template Button Listener
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.template-btn').forEach(b => 
                b.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50')
            );
            e.target.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');

            const newKey = e.target.dataset.key;
            state.template = newKey;
            templateInput.value = newKey;
            renderPoster();
        });
    });

    renderPoster();
});