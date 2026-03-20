let cardsGlobal = [];
let deletedCardsGlobal = [];
let sortMode = "count"; // "count" | "alphabetical"
let searchQuery = "";
let groupSearchQuery = "";

const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const searchInput = document.getElementById("searchInput");
const groupSearchInput = document.getElementById("groupSearchInput");
const sortRadios = document.querySelectorAll('input[name="sortMode"]');
const exportBtn = document.getElementById("exportBtn");
const summaryEl = document.getElementById("summary");
const accordionEl = document.getElementById("accordion");

fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
        fileNameDisplay.textContent = "No file selected";
        return;
    }

    fileNameDisplay.textContent = file.name;
    const text = await file.text();
    cardsGlobal = parseVcf(text);
    deletedCardsGlobal = [];

    // enable controls
    searchInput.disabled = false;
    groupSearchInput.disabled = false;
    exportBtn.disabled = false;
    sortRadios.forEach(r => r.disabled = false);

    searchQuery = "";
    groupSearchQuery = "";
    searchInput.value = "";
    groupSearchInput.value = "";
    document.getElementById("sortCount").checked = true;
    sortMode = "count";

    updateView();
});

sortRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
        sortMode = e.target.value;
        updateView();
    });
});

searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    updateView();
});

groupSearchInput.addEventListener("input", (e) => {
    groupSearchQuery = e.target.value.trim().toLowerCase();
    updateView();
});

const exportModal = document.getElementById("exportModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelExportBtn = document.getElementById("cancelExportBtn");
const confirmExportBtn = document.getElementById("confirmExportBtn");
const exportContactList = document.getElementById("exportContactList");
const exportCountBadge = document.getElementById("exportCountBadge");
const groupCountBadge = document.getElementById("groupCountBadge");

exportBtn.addEventListener("click", () => {
    if (!cardsGlobal.length && !deletedCardsGlobal.length) return;
    
    const deletedListContainer = document.getElementById("deletedListContainer");

    exportCountBadge.textContent = deletedCardsGlobal.length;
    exportContactList.innerHTML = "";
    
    if (deletedCardsGlobal.length === 0) {
        deletedListContainer.style.display = "none";
    } else {
        deletedListContainer.style.display = "block";
        const sortedDeleted = [...deletedCardsGlobal].sort((a,b) => a.name.localeCompare(b.name));
        sortedDeleted.forEach(c => {
            const li = document.createElement("li");
            
            const nameSpan = document.createElement("span");
            nameSpan.textContent = c.name;
            
            const suffixSpan = document.createElement("span");
            suffixSpan.className = "contact-suffix";
            suffixSpan.textContent = c.suffix || "No Suffix";
            
            li.appendChild(nameSpan);
            li.appendChild(suffixSpan);
            exportContactList.appendChild(li);
        });
    }

    exportModal.showModal();
});

const closeExportModal = () => {
    exportModal.close();
};

closeModalBtn.addEventListener("click", closeExportModal);
cancelExportBtn.addEventListener("click", closeExportModal);
exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) exportModal.close(); 
});

confirmExportBtn.addEventListener("click", () => {
    const updatedText = buildUpdatedVcf(cardsGlobal);

    const blob = new Blob([updatedText], {
        type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-updated.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    exportModal.close();
});

function updateView() {
    if (!cardsGlobal.length) {
        accordionEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined empty-icon">contacts</span>
                <p>No contacts loaded.</p>
            </div>
        `;
        summaryEl.innerHTML = '<p class="muted">Load a .vcf file to begin processing.</p>';
        if (groupCountBadge) groupCountBadge.style.display = "none";
        return;
    }

    const filtered = filterCards(cardsGlobal, searchQuery);
    let groups = groupBySuffix(filtered, sortMode);
    
    if (groupSearchQuery) {
        const filteredGroups = new Map();
        for (const [suffix, cards] of groups.entries()) {
            if (suffix.toLowerCase().includes(groupSearchQuery)) {
                filteredGroups.set(suffix, cards);
            }
        }
        groups = filteredGroups;
    }

    renderAccordion(groups, cardsGlobal.length, filtered.length, searchQuery);
}

function renderAccordion(groups, totalCount, filteredCount, query) {
    accordionEl.innerHTML = "";

    const noSuffixCount = groups.get("No Suffix")?.length || 0;

    let html = `
        <span class="chip chip-surface">Total: <span class="chip-val">${totalCount}</span></span>
        <span class="chip chip-surface">Showing: <span class="chip-val">${filteredCount}</span></span>
        <span class="chip chip-surface">Groups: <span class="chip-val">${groups.size}</span></span>
        <span class="chip ${noSuffixCount > 0 ? 'chip-error' : 'chip-surface'}">No Suffix: <span class="chip-val">${noSuffixCount}</span></span>
    `;

    if (query) {
        html += `<span class="chip chip-primary">Search: <span class="chip-val">"${query}"</span></span>`;
    }

    summaryEl.innerHTML = html;
    
    if (groupCountBadge) {
        groupCountBadge.textContent = groups.size;
        groupCountBadge.style.display = groups.size > 0 ? "inline-flex" : "none";
    }

    if (filteredCount === 0) {
        accordionEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined empty-icon">search_off</span>
                <p>No results found for "${query}"</p>
            </div>
        `;
        return;
    }

    for (const [suffix, cards] of groups.entries()) {
        const details = document.createElement("details");
        details.className = "accordion-panel";
        
        const summary = document.createElement("summary");
        summary.className = "accordion-header";

        const titleSpan = document.createElement("span");
        titleSpan.className = "group-title";
        titleSpan.textContent = suffix;
        
        const badge = document.createElement("span");
        badge.className = "badge" + (suffix === "No Suffix" ? " badge-error" : " badge-primary");
        badge.textContent = cards.length;
        
        const chevron = document.createElement("span");
        chevron.className = "material-symbols-outlined chevron";
        chevron.textContent = "expand_more";

        summary.appendChild(titleSpan);
        summary.appendChild(badge);
        summary.appendChild(chevron);

        const listContainer = document.createElement("div");
        listContainer.className = "list-container";
        
        const list = document.createElement("ul");
        list.className = "contact-list";
        
        const sortedCards = [...cards].sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        sortedCards.forEach((card) => {
            const li = document.createElement("li");
            li.className = "list-item";

            const nameContainer = document.createElement("div");
            nameContainer.className = "contact-name-container";
            
            const nameWrapper = document.createElement("div");
            nameWrapper.style.display = "flex";
            nameWrapper.style.alignItems = "center";
            nameWrapper.style.gap = "8px";

            const nameSpan = document.createElement("div");
            nameSpan.className = "contact-name";
            nameSpan.textContent = card.name;
            
            nameWrapper.appendChild(nameSpan);

            if (card.phones.length > 0 || card.emails.length > 0) {
                const tooltipWrapper = document.createElement("div");
                tooltipWrapper.className = "custom-tooltip-wrapper";

                const infoIcon = document.createElement("span");
                infoIcon.className = "material-symbols-outlined contact-info-icon";
                infoIcon.textContent = "info";
                infoIcon.tabIndex = 0; // touch and keyboard accessibility
                
                const tooltipContent = document.createElement("div");
                tooltipContent.className = "custom-tooltip-content";
                
                const detailsArr = [];
                if (card.phones.length > 0) {
                    detailsArr.push(`<div style="color:#94a3b8; margin-bottom:2px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Phones</div><div style="line-height:1.5;">${card.phones.join('<br>')}</div>`);
                }
                if (card.emails.length > 0) {
                    detailsArr.push(`<div style="color:#94a3b8; margin-bottom:2px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">Emails</div><div style="line-height:1.5;">${card.emails.join('<br>')}</div>`);
                }
                
                tooltipContent.innerHTML = detailsArr.join("<br><br>");
                
                tooltipWrapper.appendChild(infoIcon);
                tooltipWrapper.appendChild(tooltipContent);
                nameWrapper.appendChild(tooltipWrapper);
            }

            nameContainer.appendChild(nameWrapper);

            const leaderSpan = document.createElement("span");
            leaderSpan.className = "leader";

            const inputContainer = document.createElement("div");
            inputContainer.className = "suffix-input-wrapper";

            const suffixInput = document.createElement("input");
            suffixInput.className = "suffix-input";
            suffixInput.type = "text";
            suffixInput.placeholder = "Suffix...";
            suffixInput.value = card.suffix || "";

            suffixInput.addEventListener("change", (e) => {
                card.suffix = e.target.value.trim();
                // To keep the user's details panel open after editing, we shouldn't trigger a full re-render here.
                // updateView(); // Disabled updateView so accordion doesn't abruptly close when modifying!
            });

            inputContainer.appendChild(suffixInput);
            
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
            deleteBtn.title = "Delete contact";
            
            deleteBtn.addEventListener("click", () => {
                deletedCardsGlobal.push(card);
                cardsGlobal = cardsGlobal.filter(c => c !== card);
                updateView();
            });

            li.appendChild(nameContainer);
            li.appendChild(leaderSpan);
            li.appendChild(inputContainer);
            li.appendChild(deleteBtn);
            list.appendChild(li);
        });

        listContainer.appendChild(list);
        details.appendChild(summary);
        details.appendChild(listContainer);
        accordionEl.appendChild(details);
    }
}
