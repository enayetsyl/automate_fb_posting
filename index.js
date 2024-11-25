require('dotenv').config();
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const bodyParser = require('body-parser');



const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

let userAccessToken = null;
let userPages = null;
let pageId = null;
let pageAccessToken = null;

// Step 1: Redirect users to Facebook for authentication
app.get('/auth/facebook', (req, res) => {
  
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FB_REDIRECT_URI}&scope=public_profile,pages_manage_posts,pages_read_engagement,pages_show_list`;
  res.redirect(authUrl);
});


// Step 2: Handle Facebook's callback and exchange code for access token
app.get('/auth/facebook/callback', async (req, res) => {
  const { code } = req.query;
  // console.log('code ', code)
  const redirectUri = 'http://localhost:3000/auth/facebook/callback';

  // console.log('redirectUri ', redirectUri)

  try {
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FB_REDIRECT_URI,
        code,
      },
    });
    // console.log('tokenResponse ', tokenResponse)

    userAccessToken = tokenResponse.data.access_token;

    // Step 3: Retrieve the user's pages
    const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token:userAccessToken,
      },
    });

    // console.log('pagesResponse ', pagesResponse)

    userPages = pagesResponse.data.data;
    pageId = userPages[0].id;
    pageAccessToken = userPages[0].access_token;

    console.log('acccess token ', userAccessToken)
    console.log('pages ', userPages)

    // console.log('pages ', userPages)

    // console.log('cursor ', pagesResponse.data.paging.cursors)

    // Store the access token and pages in the session or database as needed
    

    res.send('Authentication successful. You can now post to your pages.');
  } catch (error) {
    console.error('Error during Facebook authentication:', error);
    res.status(500).send('Authentication failed.');
  }
});



app.post('/posttopage', async(req, res) =>{

  const videoUrl  = "https://res.cloudinary.com/deqyxkw0y/video/upload/v1712413507/samples/sea-turtle.mp4"
  const img = "https://res.cloudinary.com/deqyxkw0y/image/upload/v1712413530/cld-sample-2.jpg"

  const message = "Hello World"

  // Step 1: Upload the image
  const imageResponse = await axios.post(
    `https://graph.facebook.com/v21.0/${pageId}/photos`,
    {
      url: img,
      published: true, // Prevent it from publishing immediately
      access_token: pageAccessToken,
    }
  );

  const imageAttachmentId = imageResponse.data.id;
  console.log('Image uploaded with attachment ID:', imageAttachmentId);

  // Step 2: Upload the video
  const videoResponse = await axios.post(
    `https://graph.facebook.com/v21.0/${pageId}/videos`,
    {
      file_url: videoUrl,
      published: true, 
      access_token: pageAccessToken,
    }
  );

  const videoAttachmentId = videoResponse.data.id;
  console.log('Video uploaded with attachment ID:', videoAttachmentId);

  // Step 3: Create a post with the uploaded media
  const postResponse = await axios.post(
    `https://graph.facebook.com/v21.0/${pageId}/feed`,
    {
      message,
      access_token: pageAccessToken,
    }
  );

  console.log('Post created:', postResponse.data);
  res.send('Post published successfully!');
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
