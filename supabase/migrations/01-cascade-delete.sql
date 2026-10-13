-- deleting an activity should remove everything attached to it.
--
-- without this, deleting a row from resources fails
--
-- this rewrites every foreign key that points at resources so it deletes its
-- own rows when the resource goes
--
-- safe to run more than once
do $$
declare fk record;
begin
    for fk in
        select c.conname,
               c.conrelid::regclass::text as child_table,
               pg_get_constraintdef(c.oid) as definition
        from pg_constraint c
        where c.contype = 'f'
          and c.confrelid = 'public.resources'::regclass
          and c.confdeltype = 'a'   -- 'a' = NO ACTION (the default)
    loop
        execute format('alter table %s drop constraint %I', fk.child_table, fk.conname);
        execute format('alter table %s add constraint %I %s on delete cascade',
                       fk.child_table, fk.conname, fk.definition);
        raise notice 'cascade enabled on %.%', fk.child_table, fk.conname;
    end loop;
end $$;

-- check, confdeltype should read 'c' for every row
select conrelid::regclass as child_table, conname, confdeltype
from pg_constraint
where contype = 'f' and confrelid = 'public.resources'::regclass
order by 1;
