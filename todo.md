1. Revisit  anilist and jikan. Those need to throw errors incase no episodes or no matches are found.

2. refactor allanime to return one source based on preference and let the user select. Implement fallbacks based on preference with m3u8 prefered then mp4 lastly dash.



Should separate scraper from mapping(caching running with hono ) and runs on cf-workers and should be scalable somehow i manage to break it every single time. Remember to add episode info from tmdb and have a query parameter to let users choose tvdb or tmdb or tvmaze which ever is greater
1. Fetch valid tmdbId(take care of the animecategory, string similarity (avoid lavenstein), use dates, number of episodes)
2. Use releaseDates 