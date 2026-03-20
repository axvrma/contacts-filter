let cardsGlobal = [];
let deletedCardsGlobal = [];
let sortMode = "count"; // "count" | "alphabetical"
let searchQuery = "";

const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const searchInput = document.getElementById("searchInput");
const toggleSortBtn = document.getElementById("toggleSort");
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
    toggleSortBtn.disabled = false;
    exportBtn.disabled = false;

    searchQuery = "";
    searchInput.value = "";

    updateView();
});

toggleSortBtn.addEventListener("click", () => {
    sortMode = sortMode === "count" ? "alphabetical" : "count";
    
    // Update button text and icon based on mode
    const icon = toggleSortBtn.querySelector(".sort-icon");
    const label = toggleSortBtn.querySelector(".btn-text");
    
    if (sortMode === "count") {
        label.textContent = "Sort Alphabetically";
        icon.textContent = "sort_by_alpha";
    } else {
        label.textContent = "Sort by Count";
        icon.textContent = "sort"; // A generic sort icon for count sorting
    }
    
    updateView();
});

searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
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
        summaryEl.textContent = "Load a .vcf file to begin processing.";
        if (groupCountBadge) groupCountBadge.style.display = "none";
        return;
    }

    const filtered = filterCards(cardsGlobal, searchQuery);
    const groups = groupBySuffix(filtered, sortMode);
    renderAccordion(groups, cardsGlobal.length, filtered.length, searchQuery);
}

function renderAccordion(groups, totalCount, filteredCount, query) {
    accordionEl.innerHTML = "";

    const noSuffixCount = groups.get("No Suffix")?.length || 0;

    let summaryText =
        `Total: ${totalCount} • Showing: ${filteredCount} • ` +
        `Groups: ${groups.size} • No suffix: ${noSuffixCount}`;

    if (query) {
        summaryText += ` • Search: "${query}"`;
    }

    summaryEl.textContent = summaryText;
    
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

            const nameSpan = document.createElement("span");
            nameSpan.className = "contact-name";
            nameSpan.textContent = card.name;
            nameSpan.title = card.name; // helpful tooltip for elided names

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

            li.appendChild(nameSpan);
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
