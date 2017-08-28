'use strict';
let _ = require('lodash');
let moment = require('moment');
let dbInteraction = require('./TMDB_interaction.js');
let User = require('./user');
let template = require('./DOM_builder');
let firebase = require('./firebase_interaction');

let Handlers = {
  loginClickEvent: function() {
    $('#btn-login').click(event => {
      logoutSearchBar();
      User.logInLogOut();
    });
  },

  /**
   * Search for movies on enter key.
   *
   * @param {api call} movieCall : ajax call to get movies
   * @param {function call} domBuilder : function to build cards
   */
  searchTmdbOnKeyUp: function(movieCall, domBuilder) {
    $('#user-input').on('keypress', event => {
      let userInput = $('#user-input');
      if (event.keyCode === 13 && document.activeElement.id === 'user-input') {
        movieCall(userInput.val()).then(movieData => {
          console.log("moviedata", movieData);
          domBuilder(movieData);
        });
      }
    });
  },
  /**
   * Add movie to Firebase.
   *
   * @param {ajax} movieAjaxCall : ajax call to add movie to Firebase.
   */
  addMovieToWatchList: function(movieAjaxCall) {
    $(document).on('click', '#add-to-watchlist', function(event) {
      let movieId = $(this).data('movie-id');
      let moviesPromise = dbInteraction.getSingleMovieFromTMDB(movieId);
      let actorsPromise = dbInteraction.getMovieActors(movieId);
      return Promise.all([moviesPromise, actorsPromise]).then(data => {
        let movie = data[0];
        let actors = data[1];
        let movieObj = Handlers.buildMovieObj(movie, actors);

        dbInteraction
          .addMovieToFirebase(movieObj)
          .then(function(movie) {
            // Populate the DOM
            console.log('Added Movie: ', movie);
          })
          .catch(error => {
            console.warn('ERROR: ', error.code, error.message);
          });
      });
    });
  },
  /**
   * Build movie object.
   *
   * @param {object} movie : movie object
   * @param {object} actors : actors object
   * @returns {object} movie with actors : movie with actors
   */
  buildMovieObj: function(movie, actors) {
    let now = moment();
    let user = User.getCurrentUser();
    let actorsArray = actors;
    let genresArray = _.map(movie.genres, function(genre) {
      return genre.name;
    });

    let movieObj = {
      actors: actorsArray,
      genre: genresArray,
      poster_thumbnail: `http://image.tmdb.org/t/p/w185${movie.poster_path}`,
      poster_large: `http://image.tmdb.org/t/p/w780${movie.poster_path}`,
      rating: 0,
      title: movie.original_title,
      year: movie.release_date,
      favorite: false,
      time_stamp: now.format(),
      uid: user.uid
    };
    return movieObj;
  },

  showUnwatched: function (){
    return new Promise ((resolve)=>{
      console.log("getCurrentUser", User.getCurrentUser());
          firebase.getMovies(User.getCurrentUser().uid).then((item)=>{
              console.log('item', item);
              resolve(item);
          });

        });
    },

};

$(document).on("click", "#btn-showWatched", ()=>{
  console.log("WATCHED");
        $('#user-input').hide();
        $('#user-unwatched').hide();
        $('#user-watched').css("display", "block");
 });
$(document).on("click", "#btn-showUnWatched", ()=>{
        $('#user-watched').hide();
        $('#user-input').hide();
        $('#user-unwatched').css("display", "block");
 });

$(document).on("click", "#btn-normSearch", ()=>{
  console.log("UNWATCHED");
        $('#user-watched').hide();
        $('#user-unwatched').hide();
        $('#user-input').css("display", "block");
 });

function logoutSearchBar(){
        $('#user-watched').hide();
        $('#user-unwatched').hide();
        $('#user-input').css("display", "block");
}

var options = {
  shouldSort: true,
  threshold: 0.05,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["title"]
};

//watched search bar
$("#user-watched").on("keydown",(e)=>{
    if (e.keyCode == 13) {
        e.preventDefault();
        let search = $("#user-watched").val();
        firebase.getMovies(User.getCurrentUser(search))
        .then((data)=>{
            let carddata = data;
            let array = $.map(data, function(value, index) {
                return [value];
            });
            var fuse = new Fuse(array, options);
            let result = fuse.search(search);
            template.buildMovieCard(result);
        }
    );
}});
//unwatched search bar
$("#user-unwatched").on("keydown",(e)=>{
    if (e.keyCode == 13) {
      console.log("got here passed the enter");
        e.preventDefault();
        let search = $("#user-unwatched").val();
        firebase.getMovies(User.getCurrentUser(search))
        .then((data)=>{
          console.log("inside the .then");
            let carddata = data;
            let array = $.map(data, function(value, index) {
              console.log("array being made");
              console.log("whats in the array", array);
                return [value];
            });
            var fuse = new Fuse(array, options);
            console.log("search happening");
            let result = fuse.search(search);
            template.buildMovieCard(result);
            console.log("put into builder");
        }
    );
}});


$('#btn-showUnWatched').on('click', ()=>{
  let watchListArray = [];
  Handlers.showUnwatched().then((item)=>{
    template.buildMovieCard(item);
    console.log('watchlistItem type of', typeof item);
    console.log('watchListArray', item);
    item.forEach((items)=>{
      console.log('items.each', items);
      watchListArray.push(items);
      // watchListArray.push(items);

    });
  });
  // console.log('typeof', typeof watchListArray);
  template.buildMovieCard(watchListArray);
});




Handlers.loginClickEvent();
Handlers.addMovieToWatchList(dbInteraction.getSingleMovieFromTMDB);
Handlers.searchTmdbOnKeyUp(dbInteraction.getMoviesFromTmdbOnSearch, template.buildMovieCard);

module.exports = Handlers;
