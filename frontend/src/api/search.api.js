import client from './client';

export const searchGifs = (q) =>
  client.get('/search/gifs', { params: { q } }).then((r) => r.data.results);

export const searchImages = (q) =>
  client.get('/search/images', { params: { q } }).then((r) => r.data.results);
