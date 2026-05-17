import { app } from "./app";
import { env } from "./config/env";

// 1. קודם כל בודקים אם גוגל הזריקה פורט, אם לא - לוקחים את ה-port מהקונפיג שלך
const port = process.env.PORT || env.port || 3000;

// 2. חובה להעביר את '0.0.0.0' כפרמטר השני כדי לאפשר גישה חיצונית לגוגל
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`IFPI integration server listening on port ${port}`);
});