const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const PORT = 8080;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

mongoose.connect('mongodb+srv://u2aakriti:CBpj1N4xQV3BBcDR@favorites.1n8tu.mongodb.net/?retryWrites=true&w=majority&appName=favorites', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const locDatabase = new mongoose.Schema({
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  }
});

const Location = mongoose.model('Location', locDatabase);


async function geocodeAddress(location) {
  try {
    console.log(`Geocoding address: ${location}`);
    const geocodeResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
      params: {
        address: location,
        key: 'AIzaSyDVt_0rUBfrYqf55f8U0kBBXQotAV4wZBU',
      },
    });

    console.log('Geocoding Response:', geocodeResponse.data);

    if (geocodeResponse.data.status === 'OK' && geocodeResponse.data.results.length > 0) {
      const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
      return { lat, lon: lng };
    } else {
      console.error('Geocoding error: Address not found or partially matched.');
      return null;
    }
  } catch (error) {
    console.error('Error during geocoding:', error);
    return null;
  }
}

app.get('/weather', async (req, res) => {
  const { city, state } = req.query;

  const location = `${city}, ${state}`;
  const coordinates = await geocodeAddress(location);

  console.log(`Coordinates: ${JSON.stringify(coordinates)}`);

  if (!coordinates) {
    return res.status(400).json({ error: 'Invalid address or geocoding failed' });
  }

  const { lat, lon } = coordinates;

  try {
    const response = await axios.get(`https://api.tomorrow.io/v4/timelines`, {
      params: {
        location: `${lat},${lon}`,
        fields: 'temperatureMax,temperatureMin,windSpeed,weatherCode,precipitationProbability,pressureSeaLevel,temperature,humidity,visibility,cloudCover,uvIndex,sunriseTime,sunsetTime',
        units: 'imperial',
        timesteps: '1d',
        timezone: 'America/Los_Angeles',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        apikey1: 'JOHL80q6pZt3ZgAQCr1vdYQkTdXcNY8q',
        apikey: 'oIhwOg67MV39AbV7U79sgShybhR39iQR',
      },
    });

    console.log('Weather API Response:', response.data);
    console.log('Response being sent:', response.data.data.timelines[0].intervals);
    res.json({ intervals: response.data.data.timelines[0].intervals });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});


app.post('/api/addFavorite', async (req, res) => {
  const {city, state} = req.body;
  if (!city || !state) {
    return res.status(400).json({
      error
    });
  }
  try {
    const newLocation = new Location({city, state});
    await newLocation.save();
    res.status(200).json({
      message: "location successfully added to favorites"
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "couldn't save location"
    });
  }
});

app.get('/api/getFavorites', async (req, res) => {
  try {
    const locations = await Location.find();
    res.status(200).json(locations);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "couldn't fetch locations"
    });
  }
});

/** chatgpt; prompt: "how do i use the database ids to delete specific locations from the the frontend but still update the backend"; 2 lines */
app.delete('/api/deleteFavorite', async (req, res) => {
    const { city, state } = req.body;
    if (!city || !state) {
        return res.status(400).json({ error: "City and state are required" });
    }
    try {
        const location = await Location.findOneAndDelete({ city, state });
        if (location) {
            res.status(200).json({ message: "Location successfully deleted" });
        } else {
            res.status(404).json({ error: "Location not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Couldn't delete location" });
    }
});


app.get('/api/favorites/check', async (req, res) => {
  const { city } = req.query;
  if (!city ) {
    return res.status(400).json({ error: "City and state are required" });
  }

  try {
    const favorite = await Location.findOne({ city });
    if (favorite) {
      res.json({
        isFavorite: true
      });
    } else {
      res.json({
        isFavorite: false
      });
    }
  } catch (error) {
    res.status(500).json({
      error
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://192.168.4.104:${PORT}`);
});
