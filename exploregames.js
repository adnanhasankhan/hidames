
// =================================
// HIDAMES - EXPLORE GAMES JAVASCRIPT
// =================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("HIDAMES Games Library Loaded!");

    // GET HTML ELEMENTS
    const searchInput = document.getElementById("gameSearch");
    const gameCards = document.querySelectorAll(".game-card");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const noGamesMessage = document.getElementById("noGamesMessage");

    // SELECTED CATEGORY
    let selectedCategory = "all";


    // FILTER GAMES FUNCTION
    function filterGames() {

        const searchText = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        let visibleGames = 0;

        gameCards.forEach(function (card) {

            // GET GAME DETAILS
            const gameName = card.textContent.toLowerCase();
            const category = card.dataset.category || "";

            // CHECK SEARCH
            const matchesSearch = gameName.includes(searchText);

            // CHECK CATEGORY
            const matchesCategory =
                selectedCategory === "all" ||
                category === selectedCategory;

            // DECIDE VISIBILITY
            const shouldShow = matchesSearch && matchesCategory;

            // SHOW OR HIDE CARD
            card.classList.toggle("hidden", !shouldShow);

            if (shouldShow) {
                visibleGames++;
            }

        });


        // UPDATE NO RESULTS MESSAGE
        if (noGamesMessage) {
            noGamesMessage.hidden = visibleGames > 0;
        }

    }


    // SEARCH BAR EVENT
    if (searchInput) {

        searchInput.addEventListener("input", function () {
            filterGames();
        });

    }


    // CATEGORY FILTER BUTTONS
    filterButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            // UPDATE SELECTED CATEGORY
            selectedCategory = button.dataset.category || "all";

            // UPDATE ACTIVE BUTTON
            filterButtons.forEach(function (btn) {

                const isActive = btn === button;

                btn.classList.toggle("active", isActive);

                btn.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );

            });

            // APPLY FILTERS
            filterGames();

        });

    });


    // INITIAL FILTER
    filterGames();

});
