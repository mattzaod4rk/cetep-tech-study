/**
 * DataService — Interface pública da camada de dados do CETEP Tech Study.
 *
 * Este módulo é o único ponto de contato entre as páginas/componentes e o
 * armazenamento de dados. Toda a lógica de negócio usa este módulo.
 *
 * Para migrar de localStorage para um banco de dados real (ex: Supabase):
 *   1. Crie um SupabaseAdapter.js com as mesmas funções exportadas
 *   2. Substitua o import abaixo — nenhuma tela precisa ser alterada.
 */

export * from './LocalStorageAdapter.js';
