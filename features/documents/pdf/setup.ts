import { Font } from "@react-pdf/renderer";

// Bawaan react-pdf memenggal kata bahasa Inggris ("Bo-gor"); alamat & nama
// produk harus utuh, jadi kata hanya dipindah ke baris berikutnya.
Font.registerHyphenationCallback((word) => [word]);
