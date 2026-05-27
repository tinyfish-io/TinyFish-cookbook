export const PLATFORMS = {
  airbnb: {
    name: 'Airbnb',
    type: 'airbnb',
    searchUrl: (city, checkIn, checkOut, guests) =>
      `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes?checkin=${checkIn}&checkout=${checkOut}&adults=${guests}`,
    goal: (city, checkIn, checkOut, guests) =>
      `Search Airbnb for accommodations in ${city} from ${checkIn} to ${checkOut} for ${guests} guest(s). ` +
      `Dismiss any popups or banners. Find the first 5 available listings. ` +
      `For each listing extract: name, property_type (Entire home/Private room/etc), price_per_night in USD, ` +
      `total_price in USD for the full stay, rating (number out of 5), review_count, listing_url, and any fees mentioned (cleaning_fee, service_fee). ` +
      `Return ONLY a JSON array: [{name, property_type, price_per_night, total_price, rating, review_count, listing_url, cleaning_fee, service_fee}]. Use null for missing fields.`,
    browserProfile: 'stealth',
    proxyConfig: { enabled: true, country_code: 'US' },
  },

  booking: {
    name: 'Booking.com',
    type: 'hotel',
    searchUrl: (city, checkIn, checkOut, guests) => {
      const [inYear, inMonth, inDay] = checkIn.split('-');
      const [outYear, outMonth, outDay] = checkOut.split('-');
      return (
        `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}` +
        `&checkin_year=${inYear}&checkin_month=${inMonth}&checkin_monthday=${inDay}` +
        `&checkout_year=${outYear}&checkout_month=${outMonth}&checkout_monthday=${outDay}` +
        `&group_adults=${guests}&no_rooms=1`
      );
    },
    goal: (city, checkIn, checkOut, guests) =>
      `Search Booking.com for hotels in ${city} checking in ${checkIn} and checking out ${checkOut} for ${guests} guest(s). ` +
      `Dismiss any popups, cookie banners, or sign-in prompts. Find the first 5 available properties sorted by default. ` +
      `For each property extract: name, property_type (Hotel/Apartment/Hostel/etc), price_per_night in USD, ` +
      `total_price in USD for the full stay, rating (number out of 10), review_count, listing_url, and breakfast_included (true/false). ` +
      `Return ONLY a JSON array: [{name, property_type, price_per_night, total_price, rating, review_count, listing_url, breakfast_included}]. Use null for missing fields.`,
    browserProfile: 'stealth',
    proxyConfig: { enabled: true, country_code: 'US' },
  },

  agoda: {
    name: 'Agoda',
    type: 'hotel',
    searchUrl: (city, checkIn, checkOut, guests) =>
      `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}&rooms=1`,
    goal: (city, checkIn, checkOut, guests) =>
      `Search Agoda for hotels in ${city} checking in ${checkIn} and checking out ${checkOut} for ${guests} guest(s). ` +
      `Dismiss any popups, cookie banners, or sign-in prompts. Wait for the hotel listings to fully load. ` +
      `Find the first 5 available hotel listings shown on the page. ` +
      `For each hotel extract: name, property_type, price_per_night in USD, total_price in USD for the full stay, ` +
      `rating (number out of 10), review_count, listing_url. ` +
      `Return ONLY a JSON array: [{name, property_type, price_per_night, total_price, rating, review_count, listing_url}]. Use null for missing fields.`,
    browserProfile: 'stealth',
    proxyConfig: { enabled: true, country_code: 'US' },
  },
};
