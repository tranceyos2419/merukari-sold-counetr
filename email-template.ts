export const successEmailTemplate = (): string => `
  <div>
    <h1>
      Hi there✋! Your Scraped data is attached below. Enjoy your data🎉!
    </h1>
  </div>
   <div class="footer">
      <p>${new Date().getFullYear()}</p>
    </div>
`;

export const errorEmailTemplate = (): string => `
  <div>
    <h1>
      Hi there, there was an issue with your last scraping request. Please check and try again.
    </h1>
  </div>

   <div class="footer">
      <p>${new Date().getFullYear()}</p>
    </div>
`;
