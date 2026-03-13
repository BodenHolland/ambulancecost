async function getCityFromZip(zip) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=USA&format=json&addressdetails=1&limit=1`, {
        headers: {
            'User-Agent': 'AmbulanceCostApp/1.0'
        }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      if (data[0].address) {
          return data[0].address.city || data[0].address.town || data[0].address.village || data[0].address.municipality || data[0].address.county || "Detected Locality";
      }
    }
    return "Detected Locality";
  } catch (err) {
    return "Detected Locality";
  }
}

getCityFromZip(process.argv[2]).then(console.log);
