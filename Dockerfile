FROM node:20-slim

WORKDIR /app

# מעתיקים קודם את קבצי ה-package
COPY package*.json ./

# מתקינים את כל החבילות (כולל חבילות פיתוח כמו typescript כדי שנוכל לקמפל)
RUN npm install

# מעתיקים את שאר הקוד של הפרויקט
COPY . .

# פקודה קריטית: מקמפלים את ה-TypeScript ל-JavaScript (מייצר את תיקיית dist)
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]