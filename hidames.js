
// =================================
// HIDAMES - MAIN JAVASCRIPT
// =================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("Welcome to HIDAMES!");

    // PLAY NOW BUTTON

    const playButton = document.querySelector(".play-btn");

    if (playButton) {

        playButton.addEventListener("click", function () {

            console.log("Opening HIDAMES Games Library...");

        });

    }

    // EXPLORE GAMES BUTTON

    const exploreButton = document.querySelector(".explore-btn");

    if (exploreButton) {

        exploreButton.addEventListener("click", function () {

            console.log("Exploring HIDAMES Games...");

        });

    }

});
