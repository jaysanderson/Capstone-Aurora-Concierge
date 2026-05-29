FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_NUCLIA_API_URL
ARG VITE_NUCLIA_KB_ID
ARG VITE_NUCLIA_API_KEY
ARG VITE_AURORA_REGION=EU
ARG VITE_BYO_LLM_PROVIDERS=azure-openai,google-vertex,aws-bedrock
ARG VITE_BYO_LLM_DEFAULT=azure-openai
ARG VITE_LANGUAGES=English,Spanish,French,German,Japanese,Mandarin

ENV VITE_NUCLIA_API_URL=$VITE_NUCLIA_API_URL \
    VITE_NUCLIA_KB_ID=$VITE_NUCLIA_KB_ID \
    VITE_NUCLIA_API_KEY=$VITE_NUCLIA_API_KEY \
    VITE_AURORA_REGION=$VITE_AURORA_REGION \
    VITE_BYO_LLM_PROVIDERS=$VITE_BYO_LLM_PROVIDERS \
    VITE_BYO_LLM_DEFAULT=$VITE_BYO_LLM_DEFAULT \
    VITE_LANGUAGES=$VITE_LANGUAGES

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
