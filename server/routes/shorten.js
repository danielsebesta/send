const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    let { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Normalize URL - ensure it's a valid absolute URL
    try {
      const urlObj = new URL(url);
      url = urlObj.toString();
      console.log('Shortening URL:', url);
    } catch (e) {
      console.error('Invalid URL format:', url, e);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const requestBody = {
      url: url,
      alias: ''
    };

    console.log('Sending to nolog.link:', JSON.stringify(requestBody));

    const response = await fetch('https://nolog.link/', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
        Accept: '*/*',
        'Accept-Language': 'cs,en-US;q=0.7,en;q=0.3',
        'Content-Type': 'application/json',
        Referer: 'https://nolog.link/',
        Origin: 'https://nolog.link',
        DNT: '1',
        'Sec-GPC': '1',
        Connection: 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Priority: 'u=0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('nolog.link API error:', response.status, errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      ); // FIXED: Changed backtick position
    }

    const data = await response.json();
    console.log('nolog.link response:', data);

    // API returns { shorturl: "nolog.link/s/glHV2p" }
    if (!data.shorturl) {
      console.error('Unexpected response format:', data);
      throw new Error('Invalid response from shortening service');
    }

    // Ensure it's a full URL with https://
    const shortenedUrl = data.shorturl.startsWith('http')
      ? data.shorturl
      : `https://${data.shorturl}`;

    console.log('Returning shortened URL:', shortenedUrl);
    res.json({ shortenedUrl });
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Failed to generate shortened URL' });
  }
};
