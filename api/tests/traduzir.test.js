'use strict';

const {
  GENERO, CORES, CLIMA, TERRENO, CLASSIFICACAO, DESIGNACAO,
  classeDeNave, duracao, normalizarLingua, traduzir, legivel,
  traduzirCores, traduzirEspecie,
} = require('../src/domain/traduzir');

describe('TC-108 tradução de atributos', () => {
  test.each([
    [undefined, CORES, 'desconhecido'],
    [null, CORES, 'desconhecido'],
    ['', CORES, 'desconhecido'],
    ['unknown', CLASSIFICACAO, 'desconhecida'],
    ['none', DESIGNACAO, 'nenhuma'],
    ['n/a', GENERO, 'não se aplica'],
    ['none', {}, 'desconhecido'],
    [' MALE ', GENERO, 'masculino'],
    ['female', GENERO, 'feminino'],
    ['mammals', CLASSIFICACAO, 'mamífero'],
    ['reptile', CLASSIFICACAO, 'réptil'],
    ['sentient', DESIGNACAO, 'senciente'],
    ['artic', CLIMA, 'ártico'],
    ['arctic', CLIMA, 'ártico'],
    ['mountains, lakes', TERRENO, 'montanhas, lagos'],
    ['red, blue', CORES, 'vermelho e azul'],
    ['brown, grey', CORES, 'castanho, cinza'],
    ['green-tan', CORES, 'verde-bege'],
    [' blue-yellow ', CORES, 'azul-amarelo'],
    ['brown, New-color', CORES, 'castanho, New-color'],
    ['Nova classificação', CLASSIFICACAO, 'Nova classificação'],
    ['constructor', CORES, 'constructor'],
    ['__proto__', CORES, '__proto__'],
  ])('traduz %p preservando termos desconhecidos', (entrada, dicionario, esperado) => {
    expect(traduzir(entrada, dicionario)).toBe(esperado);
  });
});

describe('TC-109 classes de naves e duração', () => {
  test.each([
    [undefined, ''], [null, ''], ['', ''],
    [' STARFIGHTER ', 'Caça'], ['walker', 'Walker'],
    ['Nova classe', 'Nova classe'], ['constructor', 'constructor'],
  ])('classe %p vira %p', (entrada, esperado) => {
    expect(classeDeNave(entrada)).toBe(esperado);
  });

  test.each([
    [undefined, 'desconhecida'], [null, 'desconhecida'],
    ['', 'desconhecida'], ['unknown', 'desconhecida'],
    ['n/a', 'desconhecida'], ['none', 'desconhecida'],
    ['0', 'desconhecida'], [0, 'desconhecida'],
    ['Live food tanks', 'tanques de comida viva'],
    ['1 hour', '1 hora'], ['2 hours', '2 horas'],
    ['1 day', '1 dia'], ['5 days', '5 dias'],
    ['1 week', '1 semana'], ['2 weeks', '2 semanas'],
    ['1 month', '1 mês'], ['2 months', '2 meses'],
    ['1 year', '1 ano'], ['2 years', '2 anos'],
    ['1.5 hours', '1,5 horas'], ['1,5 hours', '1,5 horas'],
    ['Texto novo', 'Texto novo'], ['2 parsecs', '2 parsecs'],
    ['2 constructor', '2 constructor'],
  ])('duração %p vira %p', (entrada, esperado) => {
    expect(duracao(entrada)).toBe(esperado);
  });
});

describe('TC-110 nomes de línguas e valores ausentes', () => {
  test.each([
    [undefined, 'desconhecida'], [null, 'desconhecida'],
    ['', 'desconhecida'], ['unknown', 'desconhecida'],
    ['none', 'desconhecida'], ['n/a', 'desconhecida'],
    [' GALATIC BASIC ', 'Galactic Basic'],
    ['galactic basic', 'Galactic Basic'], ['gungan basic', 'Gungan Basic'],
    ['Shyriiwook', 'Shyriiwook'], ['besalisk', 'Besalisk'],
    ['constructor', 'Constructor'],
  ])('língua %p é normalizada sem traduzir o nome', (entrada, esperado) => {
    expect(normalizarLingua(entrada)).toBe(esperado);
  });

  test.each([
    [undefined, 'desconhecido'], [null, 'desconhecido'],
    ['', 'desconhecido'], [' UNKNOWN ', 'desconhecido'],
    ['n/a', 'desconhecido'], ['none', 'desconhecido'],
    ['Luke Skywalker', 'Luke Skywalker'], [180, '180'],
  ])('valor %p permanece legível', (entrada, esperado) => {
    expect(legivel(entrada)).toBe(esperado);
  });
});

describe('TC-111 cores e apresentação de Espécies', () => {
  test('paleta preserva a cor original ao lado do rótulo traduzido', () => {
    expect(traduzirCores('brown, , blue-gray, New-color')).toEqual([
      { valor: 'brown', nome: 'castanho' },
      { valor: 'blue-gray', nome: 'azul-acinzentado' },
      { valor: 'New-color', nome: 'New-color' },
    ]);
  });

  test.each([
    [undefined, '', 'desconhecido'], [null, '', 'desconhecido'],
    ['', '', 'desconhecido'], [' unknown ', 'unknown', 'desconhecido'],
    ['none', 'none', 'nenhum'], ['n/a', 'n/a', 'não se aplica'],
  ])('cor ausente %p recebe texto legível', (entrada, valor, nome) => {
    expect(traduzirCores(entrada)).toEqual([{ valor, nome }]);
  });

  test('espécie ganha ptBR sem alterar dados de origem ou referências', () => {
    const especie = Object.freeze({
      name: 'Wookie', classification: 'mammal', designation: 'sentient',
      language: 'Shyriiwook', skin_colors: 'gray', hair_colors: 'brown', eye_colors: 'blue',
      homeworld: 'https://swapi.info/api/planets/14',
      people: Object.freeze(['https://swapi.info/api/people/13']),
      url: 'https://swapi.info/api/species/3',
    });
    const resultado = traduzirEspecie(especie);
    const { ptBR, ...originais } = resultado;
    expect(originais).toEqual(especie);
    expect(resultado).not.toBe(especie);
    expect(especie).not.toHaveProperty('ptBR');
    expect(ptBR).toEqual({
      classification: 'mamífero', designation: 'senciente', language: 'Shyriiwook',
      skin_colors: [{ valor: 'gray', nome: 'cinza' }],
      hair_colors: [{ valor: 'brown', nome: 'castanho' }],
      eye_colors: [{ valor: 'blue', nome: 'azul' }],
    });
  });

  test('campos opcionais ausentes não impedem a apresentação', () => {
    expect(traduzirEspecie({ name: 'Espécie nova' }).ptBR).toEqual({
      classification: 'desconhecido', designation: 'desconhecido', language: 'desconhecida',
      skin_colors: [{ valor: '', nome: 'desconhecido' }],
      hair_colors: [{ valor: '', nome: 'desconhecido' }],
      eye_colors: [{ valor: '', nome: 'desconhecido' }],
    });
  });
});
