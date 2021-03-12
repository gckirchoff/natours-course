/* eslint-disable */

const stripe = Stripe(
  'pk_test_51ITY2uFqCUJxxbMANVq0y1KTog8tUjyxxW2PLydn6UQsVRhW1uR9Nr9IlhuUPmcIxmguJDS03HIF9SrncAhPuVFA00pqaC319B'
);

const bookButton = document.getElementById('book-tour');

// const mapBox = document.getElementById('map');
// const locations = JSON.parse(mapBox.dataset.locations);

const bookTour = async (tourId) => {
  try {
    // Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // Create checkout form and charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};

if (bookButton) {
  bookButton.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
