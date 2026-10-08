begin;
insert into categorias (slug, nome, ordem) values
  ('moda-vestuario','Moda e Vestuário',1),
  ('eletronicos-celulares','Eletrônicos e Celulares',2),
  ('beleza-cuidado-pessoal','Beleza e Cuidado Pessoal',3),
  ('eletrodomesticos','Eletrodomésticos',4),
  ('esportes-fitness','Esportes e Fitness',5),
  ('casa-utilidades-decoracao','Casa, Utilidades e Decoração',6),
  ('maquinas-pecas','Máquinas e Peças',7)
on conflict (slug) do update set nome = excluded.nome, ordem = excluded.ordem;
update produtos set categoria='casa-utilidades-decoracao' where categoria='casa';
update produtos set categoria='eletronicos-celulares' where categoria='tech';
update produtos set categoria='maquinas-pecas' where categoria='ferramentas';
update produtos set categoria='beleza-cuidado-pessoal' where categoria='beleza';
delete from categorias where slug in ('casa','tech','ferramentas','beleza','criancas');
commit;