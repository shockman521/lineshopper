// Vercel Serverless Function to fetch odds from The Odds API

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Fetch NFL and NCAAFB odds
    const sports = ['americanfootball_nfl', 'americanfootball_ncaaf'];
    const regions = 'us';
    const markets = 'h2h,spreads,totals'; // moneyline, spreads, totals
    const oddsFormat = 'american';
    
    // Fetch both sports in parallel
    const oddsPromises = sports.map(sport =>
      fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=${oddsFormat}`
      ).then(res => res.json())
    );

    const [nflOdds, ncaafOdds] = await Promise.all(oddsPromises);

    // Combine and format the odds
    const allGames = [...nflOdds, ...ncaafOdds].map(game => ({
      id: game.id,
      sport: game.sport_key === 'americanfootball_nfl' ? 'NFL' : 'NCAAFB',
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commence_time: game.commence_time,
      bookmakers: game.bookmakers.map(bookmaker => ({
        key: bookmaker.key,
        title: bookmaker.title,
        markets: bookmaker.markets
      }))
    }));

    // Set cache headers (cache for 5 minutes)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    res.status(200).json({ 
      success: true, 
      games: allGames,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({ 
      error: 'Failed to fetch odds', 
      message: error.message 
    });
  }
}
