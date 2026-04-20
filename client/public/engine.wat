(module
 (type $0 (func (param i32 i32) (result i32)))
 (type $1 (func (param i32) (result i32)))
 (type $2 (func (result i32)))
 (type $3 (func (param i32 i32 i32)))
 (type $4 (func (param i32 i32 i32 i32)))
 (type $5 (func (param i32 i32)))
 (type $6 (func))
 (type $7 (func (param i32)))
 (type $8 (func (param i32 i32 i32 i32) (result i32)))
 (type $9 (func (param i32 i32 i32 i32 i32 i32 i32)))
 (type $10 (func (param i32 i32 i32 i32 i32 i32)))
 (type $11 (func (param i32 i32 i32) (result i32)))
 (type $12 (func (param i32 i32 i32 i32 i32)))
 (type $13 (func (param i32 i32 i32 i32 i32) (result i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $assembly/util/cardLookup/cardRegistry (mut i32) (i32.const 0))
 (global $assembly/util/cardLookup/pendingCard (mut i32) (i32.const 0))
 (global $~argumentsLength (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 11104))
 (memory $0 1)
 (data $0 (i32.const 1036) "<")
 (data $0.1 (i32.const 1048) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $1 (i32.const 1100) "<")
 (data $1.1 (i32.const 1112) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s")
 (data $2 (i32.const 1164) ",")
 (data $2.1 (i32.const 1176) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $3 (i32.const 1212) "<")
 (data $3.1 (i32.const 1224) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s")
 (data $4 (i32.const 1276) "<")
 (data $4.1 (i32.const 1288) "\01\00\00\00,\00\00\00\00\00\00\00d\00\00\00i\00\00\00n\00\00\00s\00\00\00x\00\00\00\82\00\00\00\8c\00\00\00\a0\00\00\00\b4\00\00\00\c8")
 (data $5 (i32.const 1340) ",")
 (data $5.1 (i32.const 1352) "\08\00\00\00\10\00\00\00\10\05\00\00\10\05\00\00,\00\00\00\0b")
 (data $6 (i32.const 1388) "<")
 (data $6.1 (i32.const 1400) "\01\00\00\00 \00\00\00\00\00\00\00\01\00\00\00\02\00\00\00\03\00\00\00\04\00\00\00\05\00\00\00\06\00\00\00\07")
 (data $7 (i32.const 1452) ",")
 (data $7.1 (i32.const 1464) "\08\00\00\00\10\00\00\00\80\05\00\00\80\05\00\00 \00\00\00\08")
 (data $8 (i32.const 1500) "\1c\01")
 (data $8.1 (i32.const 1512) "\01\00\00\00\00\01\00\00\98/\8aB\91D7q\cf\fb\c0\b5\a5\db\b5\e9[\c2V9\f1\11\f1Y\a4\82?\92\d5^\1c\ab\98\aa\07\d8\01[\83\12\be\851$\c3}\0cUt]\ber\fe\b1\de\80\a7\06\dc\9bt\f1\9b\c1\c1i\9b\e4\86G\be\ef\c6\9d\c1\0f\cc\a1\0c$o,\e9-\aa\84tJ\dc\a9\b0\\\da\88\f9vRQ>\98m\c61\a8\c8\'\03\b0\c7\7fY\bf\f3\0b\e0\c6G\91\a7\d5Qc\ca\06g))\14\85\n\b7\'8!\1b.\fcm,M\13\r8STs\ne\bb\njv.\c9\c2\81\85,r\92\a1\e8\bf\a2Kf\1a\a8p\8bK\c2\a3Ql\c7\19\e8\92\d1$\06\99\d6\855\0e\f4p\a0j\10\16\c1\a4\19\08l7\1eLwH\'\b5\bc\b04\b3\0c\1c9J\aa\d8NO\ca\9c[\f3o.h\ee\82\8ftoc\a5x\14x\c8\84\08\02\c7\8c\fa\ff\be\90\eblP\a4\f7\a3\f9\be\f2xq\c6")
 (data $9 (i32.const 1788) ",")
 (data $9.1 (i32.const 1800) "\t\00\00\00\10\00\00\00\f0\05\00\00\f0\05\00\00\00\01\00\00@")
 (data $10 (i32.const 1836) ",")
 (data $10.1 (i32.const 1848) "\02\00\00\00\0e\00\00\00g\00a\00m\00e\00L\00o\00g")
 (data $11 (i32.const 1884) ",")
 (data $11.1 (i32.const 1896) "\02\00\00\00\14\00\00\00a\00n\00i\00m\00a\00t\00i\00o\00n\00s")
 (data $12 (i32.const 1932) ",")
 (data $12.1 (i32.const 1944) "\02\00\00\00\1c\00\00\00t\00a\00r\00g\00e\00t\00i\00n\00g\00S\00t\00a\00t\00e")
 (data $13 (i32.const 1980) "<")
 (data $13.1 (i32.const 1992) "\02\00\00\00,\00\00\00s\00p\00e\00l\00l\00P\00e\00t\00P\00h\00a\00s\00e\00S\00t\00a\00r\00t\00T\00i\00m\00e")
 (data $14 (i32.const 2044) ",")
 (data $14.1 (i32.const 2056) "\01\00\00\00\10\00\00\00@\07\00\00p\07\00\00\a0\07\00\00\d0\07")
 (data $15 (i32.const 2092) ",")
 (data $15.1 (i32.const 2104) "\05\00\00\00\10\00\00\00\10\08\00\00\10\08\00\00\10\00\00\00\04")
 (data $16 (i32.const 2140) "\1c")
 (data $16.1 (i32.const 2152) "\02")
 (data $17 (i32.const 2172) "\1c")
 (data $17.1 (i32.const 2184) "\01")
 (data $18 (i32.const 2204) ",")
 (data $18.1 (i32.const 2216) "\02\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $19 (i32.const 2252) "<")
 (data $19.1 (i32.const 2264) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $20 (i32.const 2316) "<")
 (data $20.1 (i32.const 2328) "\02\00\00\00$\00\00\00~\00l\00i\00b\00/\00t\00y\00p\00e\00d\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $21 (i32.const 2380) "<")
 (data $21.1 (i32.const 2392) "\02\00\00\00 \00\00\000\001\002\003\004\005\006\007\008\009\00a\00b\00c\00d\00e\00f")
 (data $22 (i32.const 2444) "\1c")
 (data $22.1 (i32.const 2456) "\02\00\00\00\02\00\00\00{")
 (data $23 (i32.const 2476) ",")
 (data $23.1 (i32.const 2488) "\02\00\00\00\1c\00\00\00\"\00c\00u\00r\00r\00e\00n\00t\00T\00u\00r\00n\00\"\00:")
 (data $24 (i32.const 2524) "|")
 (data $24.1 (i32.const 2536) "\02\00\00\00d\00\00\00t\00o\00S\00t\00r\00i\00n\00g\00(\00)\00 \00r\00a\00d\00i\00x\00 \00a\00r\00g\00u\00m\00e\00n\00t\00 \00m\00u\00s\00t\00 \00b\00e\00 \00b\00e\00t\00w\00e\00e\00n\00 \002\00 \00a\00n\00d\00 \003\006")
 (data $25 (i32.const 2652) "<")
 (data $25.1 (i32.const 2664) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00u\00t\00i\00l\00/\00n\00u\00m\00b\00e\00r\00.\00t\00s")
 (data $26 (i32.const 2716) "\1c")
 (data $26.1 (i32.const 2728) "\02\00\00\00\02\00\00\000")
 (data $27 (i32.const 2748) "0\000\000\001\000\002\000\003\000\004\000\005\000\006\000\007\000\008\000\009\001\000\001\001\001\002\001\003\001\004\001\005\001\006\001\007\001\008\001\009\002\000\002\001\002\002\002\003\002\004\002\005\002\006\002\007\002\008\002\009\003\000\003\001\003\002\003\003\003\004\003\005\003\006\003\007\003\008\003\009\004\000\004\001\004\002\004\003\004\004\004\005\004\006\004\007\004\008\004\009\005\000\005\001\005\002\005\003\005\004\005\005\005\006\005\007\005\008\005\009\006\000\006\001\006\002\006\003\006\004\006\005\006\006\006\007\006\008\006\009\007\000\007\001\007\002\007\003\007\004\007\005\007\006\007\007\007\008\007\009\008\000\008\001\008\002\008\003\008\004\008\005\008\006\008\007\008\008\008\009\009\000\009\001\009\002\009\003\009\004\009\005\009\006\009\007\009\008\009\009")
 (data $28 (i32.const 3148) "\1c\04")
 (data $28.1 (i32.const 3160) "\02\00\00\00\00\04\00\000\000\000\001\000\002\000\003\000\004\000\005\000\006\000\007\000\008\000\009\000\00a\000\00b\000\00c\000\00d\000\00e\000\00f\001\000\001\001\001\002\001\003\001\004\001\005\001\006\001\007\001\008\001\009\001\00a\001\00b\001\00c\001\00d\001\00e\001\00f\002\000\002\001\002\002\002\003\002\004\002\005\002\006\002\007\002\008\002\009\002\00a\002\00b\002\00c\002\00d\002\00e\002\00f\003\000\003\001\003\002\003\003\003\004\003\005\003\006\003\007\003\008\003\009\003\00a\003\00b\003\00c\003\00d\003\00e\003\00f\004\000\004\001\004\002\004\003\004\004\004\005\004\006\004\007\004\008\004\009\004\00a\004\00b\004\00c\004\00d\004\00e\004\00f\005\000\005\001\005\002\005\003\005\004\005\005\005\006\005\007\005\008\005\009\005\00a\005\00b\005\00c\005\00d\005\00e\005\00f\006\000\006\001\006\002\006\003\006\004\006\005\006\006\006\007\006\008\006\009\006\00a\006\00b\006\00c\006\00d\006\00e\006\00f\007\000\007\001\007\002\007\003\007\004\007\005\007\006\007\007\007\008\007\009\007\00a\007\00b\007\00c\007\00d\007\00e\007\00f\008\000\008\001\008\002\008\003\008\004\008\005\008\006\008\007\008\008\008\009\008\00a\008\00b\008\00c\008\00d\008\00e\008\00f\009\000\009\001\009\002\009\003\009\004\009\005\009\006\009\007\009\008\009\009\009\00a\009\00b\009\00c\009\00d\009\00e\009\00f\00a\000\00a\001\00a\002\00a\003\00a\004\00a\005\00a\006\00a\007\00a\008\00a\009\00a\00a\00a\00b\00a\00c\00a\00d\00a\00e\00a\00f\00b\000\00b\001\00b\002\00b\003\00b\004\00b\005\00b\006\00b\007\00b\008\00b\009\00b\00a\00b\00b\00b\00c\00b\00d\00b\00e\00b\00f\00c\000\00c\001\00c\002\00c\003\00c\004\00c\005\00c\006\00c\007\00c\008\00c\009\00c\00a\00c\00b\00c\00c\00c\00d\00c\00e\00c\00f\00d\000\00d\001\00d\002\00d\003\00d\004\00d\005\00d\006\00d\007\00d\008\00d\009\00d\00a\00d\00b\00d\00c\00d\00d\00d\00e\00d\00f\00e\000\00e\001\00e\002\00e\003\00e\004\00e\005\00e\006\00e\007\00e\008\00e\009\00e\00a\00e\00b\00e\00c\00e\00d\00e\00e\00e\00f\00f\000\00f\001\00f\002\00f\003\00f\004\00f\005\00f\006\00f\007\00f\008\00f\009\00f\00a\00f\00b\00f\00c\00f\00d\00f\00e\00f\00f")
 (data $29 (i32.const 4204) "\\")
 (data $29.1 (i32.const 4216) "\02\00\00\00H\00\00\000\001\002\003\004\005\006\007\008\009\00a\00b\00c\00d\00e\00f\00g\00h\00i\00j\00k\00l\00m\00n\00o\00p\00q\00r\00s\00t\00u\00v\00w\00x\00y\00z")
 (data $30 (i32.const 4300) ",")
 (data $30.1 (i32.const 4312) "\02\00\00\00\1a\00\00\00,\00\"\00g\00a\00m\00e\00P\00h\00a\00s\00e\00\"\00:")
 (data $31 (i32.const 4348) "<")
 (data $31.1 (i32.const 4360) "\02\00\00\00&\00\00\00,\00\"\00i\00n\00s\00t\00a\00n\00c\00e\00C\00o\00u\00n\00t\00e\00r\00\"\00:")
 (data $32 (i32.const 4412) ",")
 (data $32.1 (i32.const 4424) "\02\00\00\00\18\00\00\00,\00\"\00o\00p\00p\00o\00n\00e\00n\00t\00\"\00:")
 (data $33 (i32.const 4460) "L")
 (data $33.1 (i32.const 4472) "\02\00\00\006\00\00\00\"\00a\00t\00t\00a\00c\00k\00s\00P\00e\00r\00f\00o\00r\00m\00e\00d\00T\00h\00i\00s\00T\00u\00r\00n\00\"\00:")
 (data $34 (i32.const 4540) "<")
 (data $34.1 (i32.const 4552) "\02\00\00\00\1e\00\00\00,\00\"\00b\00a\00t\00t\00l\00e\00f\00i\00e\00l\00d\00\"\00:")
 (data $35 (i32.const 4604) "\1c")
 (data $35.1 (i32.const 4616) "\02\00\00\00\02\00\00\00[")
 (data $36 (i32.const 4636) "\1c")
 (data $36.1 (i32.const 4648) "\02\00\00\00\02\00\00\00,")
 (data $37 (i32.const 4668) "|")
 (data $37.1 (i32.const 4680) "\02\00\00\00^\00\00\00E\00l\00e\00m\00e\00n\00t\00 \00t\00y\00p\00e\00 \00m\00u\00s\00t\00 \00b\00e\00 \00n\00u\00l\00l\00a\00b\00l\00e\00 \00i\00f\00 \00a\00r\00r\00a\00y\00 \00i\00s\00 \00h\00o\00l\00e\00y")
 (data $38 (i32.const 4796) "<")
 (data $38.1 (i32.const 4808) "\02\00\00\00&\00\00\00\"\00a\00t\00t\00a\00c\00k\00s\00P\00e\00r\00f\00o\00r\00m\00e\00d\00\"\00:")
 (data $39 (i32.const 4860) ",")
 (data $39.1 (i32.const 4872) "\02\00\00\00\1a\00\00\00,\00\"\00c\00a\00n\00A\00t\00t\00a\00c\00k\00\"\00:")
 (data $40 (i32.const 4908) "\1c")
 (data $40.1 (i32.const 4920) "\02\00\00\00\08\00\00\00t\00r\00u\00e")
 (data $41 (i32.const 4940) "\1c")
 (data $41.1 (i32.const 4952) "\02\00\00\00\n\00\00\00f\00a\00l\00s\00e")
 (data $42 (i32.const 4972) ",")
 (data $42.1 (i32.const 4984) "\02\00\00\00\14\00\00\00,\00\"\00c\00a\00r\00d\00I\00d\00\"\00:")
 (data $43 (i32.const 5020) "<")
 (data $43.1 (i32.const 5032) "\02\00\00\00\"\00\00\00,\00\"\00c\00u\00r\00r\00e\00n\00t\00A\00t\00t\00a\00c\00k\00\"\00:")
 (data $44 (i32.const 5084) "<")
 (data $44.1 (i32.const 5096) "\02\00\00\00*\00\00\00,\00\"\00c\00u\00r\00r\00e\00n\00t\00D\00u\00r\00a\00b\00i\00l\00i\00t\00y\00\"\00:")
 (data $45 (i32.const 5148) "<")
 (data $45.1 (i32.const 5160) "\02\00\00\00\"\00\00\00,\00\"\00c\00u\00r\00r\00e\00n\00t\00H\00e\00a\00l\00t\00h\00\"\00:")
 (data $46 (i32.const 5212) "<")
 (data $46.1 (i32.const 5224) "\02\00\00\00$\00\00\00,\00\"\00e\00v\00o\00l\00u\00t\00i\00o\00n\00L\00e\00v\00e\00l\00\"\00:")
 (data $47 (i32.const 5276) "<")
 (data $47.1 (i32.const 5288) "\02\00\00\00\1e\00\00\00,\00\"\00h\00a\00s\00A\00t\00t\00a\00c\00k\00e\00d\00\"\00:")
 (data $48 (i32.const 5340) ",")
 (data $48.1 (i32.const 5352) "\02\00\00\00\1a\00\00\00,\00\"\00h\00a\00s\00C\00h\00a\00r\00g\00e\00\"\00:")
 (data $49 (i32.const 5388) "<")
 (data $49.1 (i32.const 5400) "\02\00\00\00&\00\00\00,\00\"\00h\00a\00s\00D\00i\00v\00i\00n\00e\00S\00h\00i\00e\00l\00d\00\"\00:")
 (data $50 (i32.const 5452) "<")
 (data $50.1 (i32.const 5464) "\02\00\00\00 \00\00\00,\00\"\00h\00a\00s\00L\00i\00f\00e\00s\00t\00e\00a\00l\00\"\00:")
 (data $51 (i32.const 5516) "<")
 (data $51.1 (i32.const 5528) "\02\00\00\00&\00\00\00,\00\"\00h\00a\00s\00M\00e\00g\00a\00W\00i\00n\00d\00f\00u\00r\00y\00\"\00:")
 (data $52 (i32.const 5580) "<")
 (data $52.1 (i32.const 5592) "\02\00\00\00 \00\00\00,\00\"\00h\00a\00s\00P\00o\00i\00s\00o\00n\00o\00u\00s\00\"\00:")
 (data $53 (i32.const 5644) "<")
 (data $53.1 (i32.const 5656) "\02\00\00\00\1e\00\00\00,\00\"\00h\00a\00s\00W\00i\00n\00d\00f\00u\00r\00y\00\"\00:")
 (data $54 (i32.const 5708) ",")
 (data $54.1 (i32.const 5720) "\02\00\00\00\1c\00\00\00,\00\"\00i\00n\00s\00t\00a\00n\00c\00e\00I\00d\00\"\00:")
 (data $55 (i32.const 5756) "\1c")
 (data $55.1 (i32.const 5768) "\02\00\00\00\02\00\00\00\"")
 (data $56 (i32.const 5788) "\1c")
 (data $56.1 (i32.const 5800) "\02\00\00\00\04\00\00\00\\\00\"")
 (data $57 (i32.const 5820) "\1c")
 (data $57.1 (i32.const 5832) "\02\00\00\00\04\00\00\00\\\00\\")
 (data $58 (i32.const 5852) "\1c")
 (data $58.1 (i32.const 5864) "\02\00\00\00\04\00\00\00\\\00n")
 (data $59 (i32.const 5884) "\1c")
 (data $59.1 (i32.const 5896) "\02\00\00\00\04\00\00\00\\\00r")
 (data $60 (i32.const 5916) "\1c")
 (data $60.1 (i32.const 5928) "\02\00\00\00\04\00\00\00\\\00t")
 (data $61 (i32.const 5948) "\1c")
 (data $61.1 (i32.const 5960) "\02\00\00\00\04\00\00\00\\\00u")
 (data $62 (i32.const 5980) ",")
 (data $62.1 (i32.const 5992) "\02\00\00\00\1c\00\00\00,\00\"\00i\00s\00B\00l\00e\00e\00d\00i\00n\00g\00\"\00:")
 (data $63 (i32.const 6028) ",")
 (data $63.1 (i32.const 6040) "\02\00\00\00\18\00\00\00,\00\"\00i\00s\00F\00r\00o\00z\00e\00n\00\"\00:")
 (data $64 (i32.const 6076) ",")
 (data $64.1 (i32.const 6088) "\02\00\00\00\18\00\00\00,\00\"\00i\00s\00M\00a\00r\00k\00e\00d\00\"\00:")
 (data $65 (i32.const 6124) "<")
 (data $65.1 (i32.const 6136) "\02\00\00\00\1e\00\00\00,\00\"\00i\00s\00P\00a\00r\00a\00l\00y\00z\00e\00d\00\"\00:")
 (data $66 (i32.const 6188) "<")
 (data $66.1 (i32.const 6200) "\02\00\00\00\"\00\00\00,\00\"\00i\00s\00P\00l\00a\00y\00e\00r\00O\00w\00n\00e\00d\00\"\00:")
 (data $67 (i32.const 6252) "<")
 (data $67.1 (i32.const 6264) "\02\00\00\00\"\00\00\00,\00\"\00i\00s\00P\00o\00i\00s\00o\00n\00e\00d\00D\00o\00T\00\"\00:")
 (data $68 (i32.const 6316) ",")
 (data $68.1 (i32.const 6328) "\02\00\00\00\14\00\00\00,\00\"\00i\00s\00R\00u\00s\00h\00\"\00:")
 (data $69 (i32.const 6364) ",")
 (data $69.1 (i32.const 6376) "\02\00\00\00\1a\00\00\00,\00\"\00i\00s\00S\00t\00e\00a\00l\00t\00h\00\"\00:")
 (data $70 (i32.const 6412) "<")
 (data $70.1 (i32.const 6424) "\02\00\00\00&\00\00\00,\00\"\00i\00s\00S\00u\00m\00m\00o\00n\00i\00n\00g\00S\00i\00c\00k\00\"\00:")
 (data $71 (i32.const 6476) ",")
 (data $71.1 (i32.const 6488) "\02\00\00\00\16\00\00\00,\00\"\00i\00s\00T\00a\00u\00n\00t\00\"\00:")
 (data $72 (i32.const 6524) "<")
 (data $72.1 (i32.const 6536) "\02\00\00\00 \00\00\00,\00\"\00i\00s\00V\00u\00l\00n\00e\00r\00a\00b\00l\00e\00\"\00:")
 (data $73 (i32.const 6588) ",")
 (data $73.1 (i32.const 6600) "\02\00\00\00\1c\00\00\00,\00\"\00i\00s\00W\00e\00a\00k\00e\00n\00e\00d\00\"\00:")
 (data $74 (i32.const 6636) ",")
 (data $74.1 (i32.const 6648) "\02\00\00\00\1a\00\00\00,\00\"\00m\00a\00x\00H\00e\00a\00l\00t\00h\00\"\00:")
 (data $75 (i32.const 6684) ",")
 (data $75.1 (i32.const 6696) "\02\00\00\00\18\00\00\00,\00\"\00s\00i\00l\00e\00n\00c\00e\00d\00\"\00:")
 (data $76 (i32.const 6732) "\1c")
 (data $76.1 (i32.const 6744) "\02\00\00\00\02\00\00\00}")
 (data $77 (i32.const 6764) "\1c")
 (data $77.1 (i32.const 6776) "\02\00\00\00\02\00\00\00]")
 (data $78 (i32.const 6796) "L")
 (data $78.1 (i32.const 6808) "\02\00\00\00.\00\00\00,\00\"\00c\00a\00r\00d\00s\00P\00l\00a\00y\00e\00d\00T\00h\00i\00s\00T\00u\00r\00n\00\"\00:")
 (data $79 (i32.const 6876) ",")
 (data $79.1 (i32.const 6888) "\02\00\00\00\10\00\00\00,\00\"\00d\00e\00c\00k\00\"\00:")
 (data $80 (i32.const 6924) "<")
 (data $80.1 (i32.const 6936) "\02\00\00\00$\00\00\00,\00\"\00f\00a\00t\00i\00g\00u\00e\00C\00o\00u\00n\00t\00e\00r\00\"\00:")
 (data $81 (i32.const 6988) ",")
 (data $81.1 (i32.const 7000) "\02\00\00\00\1a\00\00\00,\00\"\00g\00r\00a\00v\00e\00y\00a\00r\00d\00\"\00:")
 (data $82 (i32.const 7036) ",")
 (data $82.1 (i32.const 7048) "\02\00\00\00\10\00\00\00,\00\"\00h\00a\00n\00d\00\"\00:")
 (data $83 (i32.const 7084) ",")
 (data $83.1 (i32.const 7096) "\02\00\00\00\14\00\00\00,\00\"\00h\00e\00a\00l\00t\00h\00\"\00:")
 (data $84 (i32.const 7132) ",")
 (data $84.1 (i32.const 7144) "\02\00\00\00\1a\00\00\00,\00\"\00h\00e\00r\00o\00A\00r\00m\00o\00r\00\"\00:")
 (data $85 (i32.const 7180) ",")
 (data $85.1 (i32.const 7192) "\02\00\00\00\1a\00\00\00,\00\"\00h\00e\00r\00o\00C\00l\00a\00s\00s\00\"\00:")
 (data $86 (i32.const 7228) ",")
 (data $86.1 (i32.const 7240) "\02\00\00\00\1c\00\00\00,\00\"\00h\00e\00r\00o\00H\00e\00a\00l\00t\00h\00\"\00:")
 (data $87 (i32.const 7276) ",")
 (data $87.1 (i32.const 7288) "\02\00\00\00\14\00\00\00,\00\"\00h\00e\00r\00o\00I\00d\00\"\00:")
 (data $88 (i32.const 7324) ",")
 (data $88.1 (i32.const 7336) "\02\00\00\00\1a\00\00\00,\00\"\00h\00e\00r\00o\00P\00o\00w\00e\00r\00\"\00:")
 (data $89 (i32.const 7372) ",")
 (data $89.1 (i32.const 7384) "\02\00\00\00\0e\00\00\00\"\00c\00o\00s\00t\00\"\00:")
 (data $90 (i32.const 7420) ",")
 (data $90.1 (i32.const 7432) "\02\00\00\00\10\00\00\00,\00\"\00n\00a\00m\00e\00\"\00:")
 (data $91 (i32.const 7468) ",")
 (data $91.1 (i32.const 7480) "\02\00\00\00\10\00\00\00,\00\"\00u\00s\00e\00d\00\"\00:")
 (data $92 (i32.const 7516) "\1c")
 (data $92.1 (i32.const 7528) "\02\00\00\00\0c\00\00\00,\00\"\00i\00d\00\"\00:")
 (data $93 (i32.const 7548) ",")
 (data $93.1 (i32.const 7560) "\02\00\00\00\10\00\00\00,\00\"\00m\00a\00n\00a\00\"\00:")
 (data $94 (i32.const 7596) ",")
 (data $94.1 (i32.const 7608) "\02\00\00\00\14\00\00\00\"\00c\00u\00r\00r\00e\00n\00t\00\"\00:")
 (data $95 (i32.const 7644) ",")
 (data $95.1 (i32.const 7656) "\02\00\00\00\0e\00\00\00,\00\"\00m\00a\00x\00\"\00:")
 (data $96 (i32.const 7692) ",")
 (data $96.1 (i32.const 7704) "\02\00\00\00\1c\00\00\00,\00\"\00o\00v\00e\00r\00l\00o\00a\00d\00e\00d\00\"\00:")
 (data $97 (i32.const 7740) "<")
 (data $97.1 (i32.const 7752) "\02\00\00\00&\00\00\00,\00\"\00p\00e\00n\00d\00i\00n\00g\00O\00v\00e\00r\00l\00o\00a\00d\00\"\00:")
 (data $98 (i32.const 7804) ",")
 (data $98.1 (i32.const 7816) "\02\00\00\00\16\00\00\00,\00\"\00s\00e\00c\00r\00e\00t\00s\00\"\00:")
 (data $99 (i32.const 7852) ",")
 (data $99.1 (i32.const 7864) "\02\00\00\00\14\00\00\00,\00\"\00w\00e\00a\00p\00o\00n\00\"\00:")
 (data $100 (i32.const 7900) "\1c")
 (data $100.1 (i32.const 7912) "\02\00\00\00\08\00\00\00n\00u\00l\00l")
 (data $101 (i32.const 7932) ",")
 (data $101.1 (i32.const 7944) "\02\00\00\00\14\00\00\00,\00\"\00p\00l\00a\00y\00e\00r\00\"\00:")
 (data $102 (i32.const 7980) ",")
 (data $102.1 (i32.const 7992) "\02\00\00\00\18\00\00\00,\00\"\00r\00n\00g\00S\00t\00a\00t\00e\00\"\00:")
 (data $103 (i32.const 8028) ",")
 (data $103.1 (i32.const 8040) "\02\00\00\00\1c\00\00\00,\00\"\00t\00u\00r\00n\00N\00u\00m\00b\00e\00r\00\"\00:")
 (data $104 (i32.const 8076) ",")
 (data $104.1 (i32.const 8088) "\02\00\00\00\14\00\00\00,\00\"\00w\00i\00n\00n\00e\00r\00\"\00:")
 (data $105 (i32.const 8124) "\1c")
 (data $105.1 (i32.const 8136) "\02\00\00\00\n\00\00\001\00.\000\00.\000")
 (data $106 (i32.const 8156) "\1c")
 (data $106.1 (i32.const 8168) "\01")
 (data $107 (i32.const 8188) "\1c")
 (data $107.1 (i32.const 8200) "\01")
 (data $108 (i32.const 8220) "\1c")
 (data $108.1 (i32.const 8232) "\01")
 (data $109 (i32.const 8252) "\1c")
 (data $109.1 (i32.const 8264) "\01")
 (data $110 (i32.const 8284) "\1c")
 (data $110.1 (i32.const 8296) "\01")
 (data $111 (i32.const 8316) ",")
 (data $111.1 (i32.const 8328) "\02\00\00\00\18\00\00\00G\00a\00m\00e\00 \00i\00s\00 \00o\00v\00e\00r")
 (data $112 (i32.const 8364) "<")
 (data $112.1 (i32.const 8376) "\02\00\00\00$\00\00\00K\00e\00y\00 \00d\00o\00e\00s\00 \00n\00o\00t\00 \00e\00x\00i\00s\00t")
 (data $113 (i32.const 8428) ",")
 (data $113.1 (i32.const 8440) "\02\00\00\00\16\00\00\00~\00l\00i\00b\00/\00m\00a\00p\00.\00t\00s")
 (data $114 (i32.const 8476) "\1c")
 (data $114.1 (i32.const 8488) "\02\00\00\00\0c\00\00\00d\00a\00m\00a\00g\00e")
 (data $115 (i32.const 8508) "\1c")
 (data $115.1 (i32.const 8520) "\02\00\00\00\08\00\00\00h\00e\00r\00o")
 (data $116 (i32.const 8540) ",")
 (data $116.1 (i32.const 8552) "\02\00\00\00\14\00\00\00a\00o\00e\00_\00d\00a\00m\00a\00g\00e")
 (data $117 (i32.const 8588) ",")
 (data $117.1 (i32.const 8600) "\02\00\00\00\16\00\00\00a\00l\00l\00_\00m\00i\00n\00i\00o\00n\00s")
 (data $118 (i32.const 8636) "\1c")
 (data $118.1 (i32.const 8648) "\02\00\00\00\08\00\00\00h\00e\00a\00l")
 (data $119 (i32.const 8668) "\1c")
 (data $119.1 (i32.const 8680) "\02\00\00\00\08\00\00\00b\00u\00f\00f")
 (data $120 (i32.const 8700) ",")
 (data $120.1 (i32.const 8712) "\02\00\00\00\18\00\00\00a\00l\00l\00_\00f\00r\00i\00e\00n\00d\00l\00y")
 (data $121 (i32.const 8748) ",")
 (data $121.1 (i32.const 8760) "\02\00\00\00\1a\00\00\00b\00u\00f\00f\00_\00a\00d\00j\00a\00c\00e\00n\00t")
 (data $122 (i32.const 8796) "\1c")
 (data $122.1 (i32.const 8808) "\02\00\00\00\08\00\00\00d\00r\00a\00w")
 (data $123 (i32.const 8828) ",")
 (data $123.1 (i32.const 8840) "\02\00\00\00\1c\00\00\00A\00r\00r\00a\00y\00 \00i\00s\00 \00e\00m\00p\00t\00y")
 (data $124 (i32.const 8876) "\1c")
 (data $124.1 (i32.const 8888) "\02\00\00\00\04\00\00\00w\00-")
 (data $125 (i32.const 8908) "\1c")
 (data $125.1 (i32.const 8920) "\02\00\00\00\n\00\00\00t\00a\00u\00n\00t")
 (data $126 (i32.const 8940) "\1c")
 (data $126.1 (i32.const 8952) "\02\00\00\00\0c\00\00\00c\00h\00a\00r\00g\00e")
 (data $127 (i32.const 8972) "\1c")
 (data $127.1 (i32.const 8984) "\02\00\00\00\08\00\00\00r\00u\00s\00h")
 (data $128 (i32.const 9004) ",")
 (data $128.1 (i32.const 9016) "\02\00\00\00\1a\00\00\00d\00i\00v\00i\00n\00e\00_\00s\00h\00i\00e\00l\00d")
 (data $129 (i32.const 9052) ",")
 (data $129.1 (i32.const 9064) "\02\00\00\00\0e\00\00\00s\00t\00e\00a\00l\00t\00h")
 (data $130 (i32.const 9100) ",")
 (data $130.1 (i32.const 9112) "\02\00\00\00\10\00\00\00w\00i\00n\00d\00f\00u\00r\00y")
 (data $131 (i32.const 9148) ",")
 (data $131.1 (i32.const 9160) "\02\00\00\00\1a\00\00\00m\00e\00g\00a\00_\00w\00i\00n\00d\00f\00u\00r\00y")
 (data $132 (i32.const 9196) ",")
 (data $132.1 (i32.const 9208) "\02\00\00\00\12\00\00\00l\00i\00f\00e\00s\00t\00e\00a\00l")
 (data $133 (i32.const 9244) ",")
 (data $133.1 (i32.const 9256) "\02\00\00\00\12\00\00\00p\00o\00i\00s\00o\00n\00o\00u\00s")
 (data $134 (i32.const 9292) "\1c")
 (data $134.1 (i32.const 9304) "\02\00\00\00\0c\00\00\00s\00u\00m\00m\00o\00n")
 (data $135 (i32.const 9324) ",")
 (data $135.1 (i32.const 9336) "\02\00\00\00\0e\00\00\00d\00e\00s\00t\00r\00o\00y")
 (data $136 (i32.const 9372) ",")
 (data $136.1 (i32.const 9384) "\02\00\00\00\12\00\00\00t\00r\00a\00n\00s\00f\00o\00r\00m")
 (data $137 (i32.const 9420) ",")
 (data $137.1 (i32.const 9432) "\02\00\00\00\14\00\00\00g\00a\00i\00n\00_\00a\00r\00m\00o\00r")
 (data $138 (i32.const 9468) ",")
 (data $138.1 (i32.const 9480) "\02\00\00\00\1a\00\00\00g\00r\00a\00n\00t\00_\00k\00e\00y\00w\00o\00r\00d")
 (data $139 (i32.const 9516) ",")
 (data $139.1 (i32.const 9528) "\02\00\00\00\12\00\00\00s\00e\00t\00_\00s\00t\00a\00t\00s")
 (data $140 (i32.const 9564) "\1c")
 (data $140.1 (i32.const 9576) "\02\00\00\00\0c\00\00\00f\00r\00e\00e\00z\00e")
 (data $141 (i32.const 9596) ",")
 (data $141.1 (i32.const 9608) "\02\00\00\00\12\00\00\00a\00l\00l\00_\00e\00n\00e\00m\00y")
 (data $142 (i32.const 9644) ",")
 (data $142.1 (i32.const 9656) "\02\00\00\00\0e\00\00\00s\00i\00l\00e\00n\00c\00e")
 (data $143 (i32.const 9692) ",")
 (data $143.1 (i32.const 9704) "\02\00\00\00\16\00\00\00m\00o\00d\00i\00f\00y\00_\00m\00a\00n\00a")
 (data $144 (i32.const 9740) "\1c")
 (data $144.1 (i32.const 9752) "\02\00\00\00\08\00\00\00g\00a\00i\00n")
 (data $145 (i32.const 9772) ",")
 (data $145.1 (i32.const 9784) "\02\00\00\00\10\00\00\00g\00a\00i\00n\00_\00m\00a\00x")
 (data $146 (i32.const 9820) "\1c")
 (data $146.1 (i32.const 9832) "\02\00\00\00\06\00\00\00s\00e\00t")
 (data $147 (i32.const 9852) ",")
 (data $147.1 (i32.const 9864) "\02\00\00\00\1c\00\00\00r\00e\00t\00u\00r\00n\00_\00t\00o\00_\00h\00a\00n\00d")
 (data $148 (i32.const 9900) ",")
 (data $148.1 (i32.const 9912) "\02\00\00\00\18\00\00\00c\00o\00p\00y\00_\00t\00o\00_\00h\00a\00n\00d")
 (data $149 (i32.const 9948) ",")
 (data $149.1 (i32.const 9960) "\02\00\00\00\14\00\00\00d\00a\00m\00a\00g\00e\00_\00a\00l\00l")
 (data $150 (i32.const 9996) ",")
 (data $150.1 (i32.const 10008) "\02\00\00\00\1a\00\00\00r\00a\00n\00d\00o\00m\00_\00d\00a\00m\00a\00g\00e")
 (data $151 (i32.const 10044) ",")
 (data $151.1 (i32.const 10056) "\02\00\00\00\16\00\00\00c\00o\00n\00d\00i\00t\00i\00o\00n\00a\00l")
 (data $152 (i32.const 10092) "\1c")
 (data $152.1 (i32.const 10104) "\02\00\00\00\n\00\00\00c\00o\00m\00b\00o")
 (data $153 (i32.const 10124) ",")
 (data $153.1 (i32.const 10136) "\02\00\00\00\14\00\00\00i\00f\00_\00d\00a\00m\00a\00g\00e\00d")
 (data $154 (i32.const 10172) ",")
 (data $154.1 (i32.const 10184) "\02\00\00\00\1a\00\00\00i\00f\00_\00h\00a\00n\00d\00_\00e\00m\00p\00t\00y")
 (data $155 (i32.const 10220) ",")
 (data $155.1 (i32.const 10232) "\02\00\00\00\1c\00\00\00i\00f\00_\00b\00o\00a\00r\00d\00_\00e\00m\00p\00t\00y")
 (data $156 (i32.const 10268) "\1c")
 (data $156.1 (i32.const 10280) "\02\00\00\00\08\00\00\00n\00o\00n\00e")
 (data $157 (i32.const 10300) "\1c")
 (data $157.1 (i32.const 10312) "\01")
 (data $158 (i32.const 10332) ",")
 (data $158.1 (i32.const 10344) "\02\00\00\00\18\00\00\00e\00n\00e\00m\00y\00_\00m\00i\00n\00i\00o\00n")
 (data $159 (i32.const 10380) "\1c")
 (data $159.1 (i32.const 10392) "\01")
 (data $160 (i32.const 10412) "<")
 (data $160.1 (i32.const 10424) "\02\00\00\00&\00\00\00U\00n\00k\00n\00o\00w\00n\00 \00a\00c\00t\00i\00o\00n\00 \00t\00y\00p\00e")
 (data $161 (i32.const 10476) "L")
 (data $161.1 (i32.const 10488) "\02\00\00\000\00\00\00A\00c\00t\00i\00o\00n\00 \00f\00a\00i\00l\00e\00d\00 \00v\00a\00l\00i\00d\00a\00t\00i\00o\00n")
 (data $162 (i32.const 10556) "\1c")
 (data $162.1 (i32.const 10568) "\02\00\00\00\0c\00\00\00c\00o\00m\00m\00o\00n")
 (data $163 (i32.const 10588) "\1c")
 (data $163.1 (i32.const 10600) "\01")
 (data $164 (i32.const 10620) "\1c")
 (data $164.1 (i32.const 10632) "\01")
 (data $165 (i32.const 10652) "\1c")
 (data $165.1 (i32.const 10664) "\01")
 (data $166 (i32.const 10684) "\1c")
 (data $166.1 (i32.const 10696) "\1a\00\00\00\08\00\00\00\01")
 (data $167 (i32.const 10716) "\1c")
 (data $167.1 (i32.const 10728) "\01")
 (data $168 (i32.const 10748) "\1c")
 (data $168.1 (i32.const 10760) "\01")
 (data $169 (i32.const 10780) "\1c")
 (data $169.1 (i32.const 10792) "\01")
 (data $170 (i32.const 10812) "\1c")
 (data $170.1 (i32.const 10824) "\1a\00\00\00\08\00\00\00\02")
 (data $171 (i32.const 10844) "\1c")
 (data $171.1 (i32.const 10856) "\01")
 (data $172 (i32.const 10876) "\1c")
 (data $172.1 (i32.const 10888) "\01")
 (data $173 (i32.const 10908) "\1c")
 (data $173.1 (i32.const 10920) "\01")
 (data $174 (i32.const 10940) "\1c")
 (data $174.1 (i32.const 10952) "\01")
 (data $175 (i32.const 10972) "\1c")
 (data $175.1 (i32.const 10984) "\01")
 (data $176 (i32.const 11004) "<")
 (data $176.1 (i32.const 11016) "\01\00\00\00,\00\00\00\00\00\00\00\n\00\00\00\19\00\00\00(\00\00\007\00\00\00A\00\00\00K\00\00\00U\00\00\00\\\00\00\00a\00\00\00d")
 (data $177 (i32.const 11068) "\1c")
 (data $177.1 (i32.const 11080) "\01")
 (data $178 (i32.const 11104) "\1e\00\00\00 \00\00\00 \00\00\00 ")
 (data $178.1 (i32.const 11128) "\02A\00\00\00\00\00\00\10A\12\00\02\t\00\00\02\01\00\00A\00\00\00B")
 (data $178.2 (i32.const 11168) "\02A\00\00 ")
 (data $178.3 (i32.const 11188) "\02A\00\00 \00\00\00 \00\00\00\02A\00\00\00\00\00\00\10\t\12\00\00\00\00\00\02A\00\00 ")
 (table $0 3 3 funcref)
 (elem $0 (i32.const 1) $assembly/poker/handEvaluator/evaluateFiveCardHand~anonymous|0 $assembly/poker/handEvaluator/evaluateFiveCardHand~anonymous|0)
 (export "getResult" (func $assembly/index/getResult))
 (export "getResultLength" (func $assembly/index/getResultLength))
 (export "hashStateJson" (func $assembly/index/hashStateJson))
 (export "computeCanonicalHash" (func $assembly/index/computeCanonicalHash))
 (export "getEngineVersion" (func $assembly/index/getEngineVersion))
 (export "_start" (func $assembly/index/_start))
 (export "createGameState" (func $assembly/index/createGameState))
 (export "createPlayer" (func $assembly/index/createPlayer))
 (export "createManaPool" (func $assembly/index/createManaPool))
 (export "createHeroPower" (func $assembly/index/createHeroPower))
 (export "createCardInstance" (func $assembly/index/createCardInstance))
 (export "createEngineAction" (func $assembly/index/createEngineAction))
 (export "applyGameAction" (func $assembly/index/applyGameAction))
 (export "getStateHash" (func $assembly/index/computeCanonicalHash))
 (export "beginCard" (func $assembly/util/cardLookup/beginCard))
 (export "setCardStats" (func $assembly/util/cardLookup/setCardStats))
 (export "setCardMeta" (func $assembly/util/cardLookup/setCardMeta))
 (export "addCardKeyword" (func $assembly/util/cardLookup/addCardKeyword))
 (export "setCardBattlecry" (func $assembly/util/cardLookup/setCardBattlecry))
 (export "setCardDeathrattle" (func $assembly/util/cardLookup/setCardDeathrattle))
 (export "setCardSpellEffect" (func $assembly/util/cardLookup/setCardSpellEffect))
 (export "commitCard" (func $assembly/util/cardLookup/commitCard))
 (export "getCardCount" (func $assembly/util/cardLookup/getCardCount))
 (export "clearCardData" (func $assembly/util/cardLookup/clearCardData))
 (export "evaluateFiveCardHand" (func $assembly/poker/handEvaluator/evaluateFiveCardHand))
 (export "findBestHand" (func $assembly/poker/handEvaluator/findBestHand))
 (export "compareHands" (func $assembly/poker/handEvaluator/compareHands))
 (export "calculateHandStrength" (func $assembly/poker/handEvaluator/calculateHandStrength))
 (export "processBettingAction" (func $assembly/poker/bettingEngine/processBettingAction))
 (export "initializeBettingState" (func $assembly/poker/bettingEngine/initializeBettingState))
 (export "resetForNewRound" (func $assembly/poker/bettingEngine/resetForNewRound))
 (export "calculateCallAmount" (func $assembly/poker/bettingEngine/calculateCallAmount))
 (export "calculateMinRaise" (func $assembly/poker/bettingEngine/calculateMinRaise))
 (export "getNextPhase" (func $assembly/poker/phaseManager/getNextPhase))
 (export "getBettingRound" (func $assembly/poker/phaseManager/getBettingRound))
 (export "isBettingPhase" (func $assembly/poker/phaseManager/isBettingPhase))
 (export "isRevealPhase" (func $assembly/poker/phaseManager/isRevealPhase))
 (export "getCommunityCardsToReveal" (func $assembly/poker/phaseManager/getCommunityCardsToReveal))
 (export "getTotalCommunityCards" (func $assembly/poker/phaseManager/getTotalCommunityCards))
 (export "calculateFinalDamage" (func $assembly/types/PokerTypes/calculateFinalDamage@varargs))
 (export "createPokerDeck" (func $assembly/types/PokerTypes/createPokerDeck))
 (export "__new" (func $~lib/rt/stub/__new))
 (export "__pin" (func $~lib/rt/stub/__pin))
 (export "__unpin" (func $~lib/rt/stub/__unpin))
 (export "__collect" (func $assembly/index/_start))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "__setArgumentsLength" (func $~setArgumentsLength))
 (start $~start)
 (func $~lib/rt/stub/__alloc (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.tee $2
  local.get $0
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $0
  i32.add
  local.tee $3
  memory.size
  local.tee $4
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $5
  i32.gt_u
  if
   local.get $4
   local.get $3
   local.get $5
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $5
   local.get $4
   local.get $5
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $5
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $3
  global.set $~lib/rt/stub/offset
  local.get $0
  i32.store
  local.get $2
 )
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  call $~lib/rt/stub/__alloc
  local.tee $3
  i32.const 4
  i32.sub
  local.tee $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  local.get $3
  i32.const 16
  i32.add
 )
 (func $~lib/arraybuffer/ArrayBuffer#constructor (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1184
   i32.const 1232
   i32.const 52
   i32.const 43
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $assembly/index/getResult (result i32)
  i32.const 2160
 )
 (func $assembly/index/getResultLength (result i32)
  i32.const 2156
  i32.load
  i32.const 1
  i32.shr_u
 )
 (func $~lib/rt/__newArray (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  local.get $0
  local.get $1
  i32.shl
  local.tee $4
  i32.const 1
  call $~lib/rt/stub/__new
  local.set $1
  local.get $3
  if
   local.get $1
   local.get $3
   local.get $4
   memory.copy
  end
  i32.const 16
  local.get $2
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $1
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  local.get $4
  i32.store offset=8
  local.get $2
  local.get $0
  i32.store offset=12
  local.get $2
 )
 (func $~lib/array/ensureCapacity (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  local.tee $4
  local.get $2
  i32.shr_u
  i32.gt_u
  if
   local.get $1
   i32.const 1073741820
   local.get $2
   i32.shr_u
   i32.gt_u
   if
    i32.const 1184
    i32.const 2224
    i32.const 19
    i32.const 48
    call $~lib/builtins/abort
    unreachable
   end
   i32.const 8
   local.get $1
   local.get $1
   i32.const 8
   i32.le_u
   select
   local.get $2
   i32.shl
   local.set $1
   local.get $0
   i32.load
   local.set $5
   local.get $3
   if
    i32.const 1073741820
    local.get $4
    i32.const 1
    i32.shl
    local.tee $2
    local.get $2
    i32.const 1073741820
    i32.ge_u
    select
    local.tee $2
    local.get $1
    local.get $1
    local.get $2
    i32.lt_u
    select
    local.set $1
   end
   local.get $1
   i32.const 1073741804
   i32.gt_u
   if
    i32.const 1056
    i32.const 1120
    i32.const 99
    i32.const 30
    call $~lib/builtins/abort
    unreachable
   end
   local.get $5
   i32.const 16
   i32.sub
   local.tee $2
   i32.const 4
   i32.sub
   local.tee $6
   i32.load
   local.set $7
   global.get $~lib/rt/stub/offset
   local.get $2
   local.get $7
   i32.add
   i32.eq
   local.set $8
   local.get $1
   i32.const 16
   i32.add
   local.tee $9
   i32.const 19
   i32.add
   i32.const -16
   i32.and
   i32.const 4
   i32.sub
   local.set $3
   local.get $7
   local.get $9
   i32.lt_u
   if
    local.get $8
    if
     local.get $9
     i32.const 1073741820
     i32.gt_u
     if
      i32.const 1056
      i32.const 1120
      i32.const 52
      i32.const 33
      call $~lib/builtins/abort
      unreachable
     end
     local.get $2
     local.get $3
     i32.add
     local.tee $7
     memory.size
     local.tee $8
     i32.const 16
     i32.shl
     i32.const 15
     i32.add
     i32.const -16
     i32.and
     local.tee $9
     i32.gt_u
     if
      local.get $8
      local.get $7
      local.get $9
      i32.sub
      i32.const 65535
      i32.add
      i32.const -65536
      i32.and
      i32.const 16
      i32.shr_u
      local.tee $9
      local.get $8
      local.get $9
      i32.gt_s
      select
      memory.grow
      i32.const 0
      i32.lt_s
      if
       local.get $9
       memory.grow
       i32.const 0
       i32.lt_s
       if
        unreachable
       end
      end
     end
     local.get $7
     global.set $~lib/rt/stub/offset
     local.get $6
     local.get $3
     i32.store
    else
     local.get $3
     local.get $7
     i32.const 1
     i32.shl
     local.tee $6
     local.get $3
     local.get $6
     i32.gt_u
     select
     call $~lib/rt/stub/__alloc
     local.tee $3
     local.get $2
     local.get $7
     memory.copy
     local.get $3
     local.set $2
    end
   else
    local.get $8
    if
     local.get $2
     local.get $3
     i32.add
     global.set $~lib/rt/stub/offset
     local.get $6
     local.get $3
     i32.store
    end
   end
   local.get $2
   i32.const 4
   i32.sub
   local.get $1
   i32.store offset=16
   local.get $2
   i32.const 16
   i32.add
   local.tee $2
   local.get $4
   i32.add
   i32.const 0
   local.get $1
   local.get $4
   i32.sub
   memory.fill
   local.get $2
   local.get $5
   i32.ne
   if
    local.get $0
    local.get $2
    i32.store
    local.get $0
    local.get $2
    i32.store offset=4
   end
   local.get $0
   local.get $1
   i32.store offset=8
  end
 )
 (func $~lib/array/Array<u8>#push (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 1
  i32.add
  local.tee $3
  i32.const 0
  i32.const 1
  call $~lib/array/ensureCapacity
  local.get $0
  i32.load offset=4
  local.get $2
  i32.add
  local.get $1
  i32.store8
  local.get $0
  local.get $3
  i32.store offset=12
 )
 (func $~lib/typedarray/Uint8Array#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  i32.const 12
  i32.const 10
  call $~lib/rt/stub/__new
  local.tee $1
  i32.eqz
  if
   i32.const 12
   i32.const 3
   call $~lib/rt/stub/__new
   local.set $1
  end
  local.get $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1184
   i32.const 1232
   i32.const 19
   i32.const 57
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
  local.get $2
  i32.store
  local.get $1
  local.get $2
  i32.store offset=4
  local.get $1
  local.get $0
  i32.store offset=8
  local.get $1
 )
 (func $~lib/typedarray/Uint8Array#__set (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2272
   i32.const 2336
   i32.const 178
   i32.const 45
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  i32.store8
 )
 (func $~lib/typedarray/Uint8Array#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2272
   i32.const 2336
   i32.const 167
   i32.const 45
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  i32.load8_u
 )
 (func $~lib/array/Array<u32>#__set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 2272
    i32.const 2224
    i32.const 130
    i32.const 22
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   i32.const 2
   i32.const 1
   call $~lib/array/ensureCapacity
   local.get $0
   local.get $3
   i32.store offset=12
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
 )
 (func $~lib/array/Array<u32>#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 2272
   i32.const 2224
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
 )
 (func $assembly/util/sha256/writeU32BE (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $0
  local.get $1
  local.get $2
  i32.const 24
  i32.shr_u
  call $~lib/typedarray/Uint8Array#__set
  local.get $0
  local.get $1
  i32.const 1
  i32.add
  local.get $2
  i32.const 16
  i32.shr_u
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $0
  local.get $1
  i32.const 2
  i32.add
  local.get $2
  i32.const 8
  i32.shr_u
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $0
  local.get $1
  i32.const 3
  i32.add
  local.get $2
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
 )
 (func $assembly/util/sha256/sha256Bytes (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  (local $14 i32)
  (local $15 i32)
  (local $16 i32)
  (local $17 i32)
  (local $18 i32)
  (local $19 i64)
  (local $20 i32)
  (local $21 i32)
  (local $22 i32)
  (local $23 i32)
  local.get $0
  i32.load offset=8
  local.tee $3
  i64.extend_i32_s
  i64.const 3
  i64.shl
  local.set $19
  i32.const 64
  local.get $3
  i32.const 9
  i32.add
  i32.const 64
  i32.rem_s
  i32.sub
  local.tee $1
  i32.const 0
  local.get $1
  i32.const 64
  i32.ne
  select
  local.get $3
  i32.add
  i32.const 9
  i32.add
  local.tee $18
  call $~lib/typedarray/Uint8Array#constructor
  local.set $16
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.lt_s
   if
    local.get $16
    local.get $2
    local.get $0
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/typedarray/Uint8Array#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $16
  local.get $3
  i32.const 128
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 8
  i32.sub
  local.get $19
  i64.const 56
  i64.shr_u
  i32.wrap_i64
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 7
  i32.sub
  local.get $19
  i64.const 48
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 6
  i32.sub
  local.get $19
  i64.const 40
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 5
  i32.sub
  local.get $19
  i64.const 32
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 4
  i32.sub
  local.get $19
  i64.const 24
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 3
  i32.sub
  local.get $19
  i64.const 16
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 2
  i32.sub
  local.get $19
  i64.const 8
  i64.shr_u
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $16
  local.get $18
  i32.const 1
  i32.sub
  local.get $19
  i32.wrap_i64
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  i32.const 1779033703
  local.set $8
  i32.const -1150833019
  local.set $9
  i32.const 1013904242
  local.set $10
  i32.const -1521486534
  local.set $11
  i32.const 1359893119
  local.set $12
  i32.const -1694144372
  local.set $13
  i32.const 528734635
  local.set $14
  i32.const 1541459225
  local.set $15
  i32.const 16
  i32.const 9
  call $~lib/rt/stub/__new
  local.tee $17
  i32.const 0
  i32.store
  local.get $17
  i32.const 0
  i32.store offset=4
  local.get $17
  i32.const 0
  i32.store offset=8
  local.get $17
  i32.const 0
  i32.store offset=12
  i32.const 256
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.const 256
  memory.fill
  local.get $17
  local.get $0
  i32.store
  local.get $17
  local.get $0
  i32.store offset=4
  local.get $17
  i32.const 256
  i32.store offset=8
  local.get $17
  i32.const 64
  i32.store offset=12
  loop $for-loop|1
   local.get $18
   local.get $21
   i32.gt_s
   if
    i32.const 0
    local.set $2
    loop $for-loop|2
     local.get $2
     i32.const 16
     i32.lt_s
     if
      local.get $17
      local.get $2
      local.get $16
      local.get $21
      local.get $2
      i32.const 2
      i32.shl
      i32.add
      local.tee $0
      call $~lib/typedarray/Uint8Array#__get
      i32.const 24
      i32.shl
      local.get $16
      local.get $0
      i32.const 1
      i32.add
      call $~lib/typedarray/Uint8Array#__get
      i32.const 16
      i32.shl
      i32.or
      local.get $16
      local.get $0
      i32.const 2
      i32.add
      call $~lib/typedarray/Uint8Array#__get
      i32.const 8
      i32.shl
      i32.or
      local.get $16
      local.get $0
      i32.const 3
      i32.add
      call $~lib/typedarray/Uint8Array#__get
      i32.or
      call $~lib/array/Array<u32>#__set
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      br $for-loop|2
     end
    end
    i32.const 16
    local.set $1
    loop $for-loop|3
     local.get $1
     i32.const 64
     i32.lt_s
     if
      local.get $17
      local.get $1
      i32.const 2
      i32.sub
      call $~lib/array/Array<u32>#__get
      local.set $0
      local.get $17
      local.get $1
      i32.const 7
      i32.sub
      call $~lib/array/Array<u32>#__get
      local.get $0
      i32.const 15
      i32.shl
      local.get $0
      i32.const 17
      i32.shr_u
      i32.or
      local.get $0
      i32.const 13
      i32.shl
      local.get $0
      i32.const 19
      i32.shr_u
      i32.or
      i32.xor
      local.get $0
      i32.const 10
      i32.shr_u
      i32.xor
      i32.add
      local.set $2
      local.get $17
      local.get $1
      i32.const 15
      i32.sub
      call $~lib/array/Array<u32>#__get
      local.set $0
      local.get $17
      local.get $1
      local.get $17
      local.get $1
      i32.const 16
      i32.sub
      call $~lib/array/Array<u32>#__get
      local.get $2
      local.get $0
      i32.const 25
      i32.shl
      local.get $0
      i32.const 7
      i32.shr_u
      i32.or
      local.get $0
      i32.const 14
      i32.shl
      local.get $0
      i32.const 18
      i32.shr_u
      i32.or
      i32.xor
      local.get $0
      i32.const 3
      i32.shr_u
      i32.xor
      i32.add
      i32.add
      call $~lib/array/Array<u32>#__set
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|3
     end
    end
    local.get $8
    local.set $4
    local.get $9
    local.set $3
    local.get $10
    local.set $1
    local.get $11
    local.set $6
    local.get $12
    local.set $5
    local.get $13
    local.set $2
    local.get $14
    local.set $0
    local.get $15
    local.set $7
    i32.const 0
    local.set $20
    loop $for-loop|4
     local.get $20
     i32.const 64
     i32.lt_s
     if
      i32.const 1808
      local.get $20
      call $~lib/array/Array<u32>#__get
      local.get $7
      local.get $5
      i32.const 7
      i32.shl
      local.get $5
      i32.const 25
      i32.shr_u
      i32.or
      local.get $5
      i32.const 26
      i32.shl
      local.get $5
      i32.const 6
      i32.shr_u
      i32.or
      local.get $5
      i32.const 21
      i32.shl
      local.get $5
      i32.const 11
      i32.shr_u
      i32.or
      i32.xor
      i32.xor
      i32.add
      local.get $2
      local.get $5
      i32.and
      local.get $5
      i32.const -1
      i32.xor
      local.get $0
      i32.and
      i32.xor
      i32.add
      i32.add
      local.get $17
      local.get $20
      call $~lib/array/Array<u32>#__get
      i32.add
      local.set $22
      local.get $4
      i32.const 10
      i32.shl
      local.get $4
      i32.const 22
      i32.shr_u
      i32.or
      local.get $4
      i32.const 30
      i32.shl
      local.get $4
      i32.const 2
      i32.shr_u
      i32.or
      local.get $4
      i32.const 19
      i32.shl
      local.get $4
      i32.const 13
      i32.shr_u
      i32.or
      i32.xor
      i32.xor
      local.get $1
      local.get $3
      i32.and
      local.get $3
      local.get $4
      i32.and
      local.get $1
      local.get $4
      i32.and
      i32.xor
      i32.xor
      i32.add
      local.set $23
      local.get $0
      local.set $7
      local.get $2
      local.set $0
      local.get $5
      local.set $2
      local.get $6
      local.get $22
      i32.add
      local.set $5
      local.get $1
      local.set $6
      local.get $3
      local.set $1
      local.get $4
      local.set $3
      local.get $22
      local.get $23
      i32.add
      local.set $4
      local.get $20
      i32.const 1
      i32.add
      local.set $20
      br $for-loop|4
     end
    end
    local.get $4
    local.get $8
    i32.add
    local.set $8
    local.get $3
    local.get $9
    i32.add
    local.set $9
    local.get $1
    local.get $10
    i32.add
    local.set $10
    local.get $6
    local.get $11
    i32.add
    local.set $11
    local.get $5
    local.get $12
    i32.add
    local.set $12
    local.get $2
    local.get $13
    i32.add
    local.set $13
    local.get $0
    local.get $14
    i32.add
    local.set $14
    local.get $7
    local.get $15
    i32.add
    local.set $15
    local.get $21
    i32.const -64
    i32.sub
    local.set $21
    br $for-loop|1
   end
  end
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $0
  i32.const 0
  local.get $8
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 4
  local.get $9
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 8
  local.get $10
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 12
  local.get $11
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 16
  local.get $12
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 20
  local.get $13
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 24
  local.get $14
  call $assembly/util/sha256/writeU32BE
  local.get $0
  i32.const 28
  local.get $15
  call $assembly/util/sha256/writeU32BE
  local.get $0
 )
 (func $~lib/string/String#charAt (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.const 2396
  i32.load
  i32.const 1
  i32.shr_u
  i32.ge_u
  if
   i32.const 2160
   return
  end
  i32.const 2
  i32.const 2
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $0
  i32.const 1
  i32.shl
  i32.const 2400
  i32.add
  i32.load16_u
  i32.store16
  local.get $1
 )
 (func $~lib/string/String.__concat (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  i32.const 2160
  local.set $2
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const -2
  i32.and
  local.tee $3
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const -2
  i32.and
  local.tee $4
  i32.add
  local.tee $5
  if
   local.get $5
   i32.const 2
   call $~lib/rt/stub/__new
   local.tee $2
   local.get $0
   local.get $3
   memory.copy
   local.get $2
   local.get $3
   i32.add
   local.get $1
   local.get $4
   memory.copy
  end
  local.get $2
 )
 (func $assembly/util/sha256/sha256 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  i32.const 0
  i32.const 0
  i32.const 11
  i32.const 2192
  call $~lib/rt/__newArray
  local.set $4
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.tee $5
   i32.lt_s
   if
    local.get $2
    local.get $5
    i32.ge_u
    if (result i32)
     i32.const -1
    else
     local.get $0
     local.get $2
     i32.const 1
     i32.shl
     i32.add
     i32.load16_u
    end
    local.tee $5
    i32.const 128
    i32.lt_s
    if
     local.get $4
     local.get $5
     call $~lib/array/Array<u8>#push
    else
     local.get $5
     i32.const 2048
     i32.lt_s
     if
      local.get $4
      local.get $5
      i32.const 6
      i32.shr_s
      i32.const 192
      i32.or
      call $~lib/array/Array<u8>#push
     else
      local.get $4
      local.get $5
      i32.const 12
      i32.shr_s
      i32.const 224
      i32.or
      call $~lib/array/Array<u8>#push
      local.get $4
      local.get $5
      i32.const 6
      i32.shr_s
      i32.const 63
      i32.and
      i32.const 128
      i32.or
      call $~lib/array/Array<u8>#push
     end
     local.get $4
     local.get $5
     i32.const 63
     i32.and
     i32.const 128
     i32.or
     call $~lib/array/Array<u8>#push
    end
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $4
  i32.load offset=12
  call $~lib/typedarray/Uint8Array#constructor
  local.set $0
  loop $for-loop|1
   local.get $1
   local.get $4
   i32.load offset=12
   local.tee $2
   i32.lt_s
   if
    local.get $1
    local.get $2
    i32.ge_u
    if
     i32.const 2272
     i32.const 2224
     i32.const 114
     i32.const 42
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    local.get $1
    local.get $4
    i32.load offset=4
    local.get $1
    i32.add
    i32.load8_u
    call $~lib/typedarray/Uint8Array#__set
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|1
   end
  end
  local.get $0
  call $assembly/util/sha256/sha256Bytes
  local.set $1
  i32.const 2160
  local.set $0
  loop $for-loop|00
   local.get $3
   local.get $1
   i32.load offset=8
   i32.lt_s
   if
    local.get $0
    local.get $1
    local.get $3
    call $~lib/typedarray/Uint8Array#__get
    local.tee $0
    i32.const 4
    i32.shr_u
    call $~lib/string/String#charAt
    call $~lib/string/String.__concat
    local.get $0
    i32.const 15
    i32.and
    call $~lib/string/String#charAt
    call $~lib/string/String.__concat
    local.set $0
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|00
   end
  end
  local.get $0
 )
 (func $assembly/index/hashStateJson (param $0 i32) (result i32)
  local.get $0
  call $assembly/util/sha256/sha256
 )
 (func $~lib/util/number/utoa32_dec_lut (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  loop $while-continue|0
   local.get $1
   i32.const 10000
   i32.ge_u
   if
    local.get $1
    i32.const 10000
    i32.rem_u
    local.set $3
    local.get $1
    i32.const 10000
    i32.div_u
    local.set $1
    local.get $0
    local.get $2
    i32.const 4
    i32.sub
    local.tee $2
    i32.const 1
    i32.shl
    i32.add
    local.get $3
    i32.const 100
    i32.div_u
    i32.const 2
    i32.shl
    i32.const 2748
    i32.add
    i64.load32_u
    local.get $3
    i32.const 100
    i32.rem_u
    i32.const 2
    i32.shl
    i32.const 2748
    i32.add
    i64.load32_u
    i64.const 32
    i64.shl
    i64.or
    i64.store
    br $while-continue|0
   end
  end
  local.get $1
  i32.const 100
  i32.ge_u
  if
   local.get $0
   local.get $2
   i32.const 2
   i32.sub
   local.tee $2
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 100
   i32.rem_u
   i32.const 2
   i32.shl
   i32.const 2748
   i32.add
   i32.load
   i32.store
   local.get $1
   i32.const 100
   i32.div_u
   local.set $1
  end
  local.get $1
  i32.const 10
  i32.ge_u
  if
   local.get $0
   local.get $2
   i32.const 2
   i32.sub
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 2
   i32.shl
   i32.const 2748
   i32.add
   i32.load
   i32.store
  else
   local.get $0
   local.get $2
   i32.const 1
   i32.sub
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 48
   i32.add
   i32.store16
  end
 )
 (func $~lib/util/number/itoa32 (param $0 i32) (param $1 i32) (result i32)
  (local $2 i64)
  (local $3 i32)
  (local $4 i64)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i64)
  local.get $1
  i32.const 2
  i32.lt_s
  local.get $1
  i32.const 36
  i32.gt_s
  i32.or
  if
   i32.const 2544
   i32.const 2672
   i32.const 373
   i32.const 5
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.eqz
  if
   i32.const 2736
   return
  end
  i32.const 0
  local.get $0
  i32.sub
  local.get $0
  local.get $0
  i32.const 31
  i32.shr_u
  i32.const 1
  i32.shl
  local.tee $7
  select
  local.set $3
  local.get $1
  i32.const 10
  i32.eq
  if
   local.get $3
   i32.const 100000
   i32.lt_u
   if (result i32)
    local.get $3
    i32.const 100
    i32.lt_u
    if (result i32)
     local.get $3
     i32.const 10
     i32.ge_u
     i32.const 1
     i32.add
    else
     local.get $3
     i32.const 10000
     i32.ge_u
     i32.const 3
     i32.add
     local.get $3
     i32.const 1000
     i32.ge_u
     i32.add
    end
   else
    local.get $3
    i32.const 10000000
    i32.lt_u
    if (result i32)
     local.get $3
     i32.const 1000000
     i32.ge_u
     i32.const 6
     i32.add
    else
     local.get $3
     i32.const 1000000000
     i32.ge_u
     i32.const 8
     i32.add
     local.get $3
     i32.const 100000000
     i32.ge_u
     i32.add
    end
   end
   local.tee $0
   i32.const 1
   i32.shl
   local.get $7
   i32.add
   i32.const 2
   call $~lib/rt/stub/__new
   local.tee $6
   local.get $7
   i32.add
   local.get $3
   local.get $0
   call $~lib/util/number/utoa32_dec_lut
  else
   local.get $1
   i32.const 16
   i32.eq
   if
    i32.const 31
    local.get $3
    i32.clz
    i32.sub
    i32.const 2
    i32.shr_s
    i32.const 1
    i32.add
    local.tee $0
    i32.const 1
    i32.shl
    local.get $7
    i32.add
    i32.const 2
    call $~lib/rt/stub/__new
    local.tee $6
    local.get $7
    i32.add
    local.set $1
    local.get $3
    i64.extend_i32_u
    local.set $2
    loop $while-continue|0
     local.get $0
     i32.const 2
     i32.ge_u
     if
      local.get $1
      local.get $0
      i32.const 2
      i32.sub
      local.tee $0
      i32.const 1
      i32.shl
      i32.add
      local.get $2
      i32.wrap_i64
      i32.const 255
      i32.and
      i32.const 2
      i32.shl
      i32.const 3168
      i32.add
      i32.load
      i32.store
      local.get $2
      i64.const 8
      i64.shr_u
      local.set $2
      br $while-continue|0
     end
    end
    local.get $0
    i32.const 1
    i32.and
    if
     local.get $1
     local.get $2
     i32.wrap_i64
     i32.const 6
     i32.shl
     i32.const 3168
     i32.add
     i32.load16_u
     i32.store16
    end
   else
    block $__inlined_func$~lib/util/number/ulog_base$67 (result i32)
     local.get $3
     i64.extend_i32_u
     local.set $4
     local.get $1
     i32.popcnt
     i32.const 1
     i32.eq
     if
      i32.const 63
      local.get $4
      i64.clz
      i32.wrap_i64
      i32.sub
      i32.const 31
      local.get $1
      i32.clz
      i32.sub
      i32.div_u
      i32.const 1
      i32.add
      br $__inlined_func$~lib/util/number/ulog_base$67
     end
     local.get $1
     i64.extend_i32_s
     local.tee $8
     local.set $2
     i32.const 1
     local.set $0
     loop $while-continue|01
      local.get $2
      local.get $4
      i64.le_u
      if
       local.get $4
       local.get $2
       i64.div_u
       local.set $4
       local.get $2
       local.get $2
       i64.mul
       local.set $2
       local.get $0
       i32.const 1
       i32.shl
       local.set $0
       br $while-continue|01
      end
     end
     loop $while-continue|1
      local.get $4
      i64.const 0
      i64.ne
      if
       local.get $4
       local.get $8
       i64.div_u
       local.set $4
       local.get $0
       i32.const 1
       i32.add
       local.set $0
       br $while-continue|1
      end
     end
     local.get $0
     i32.const 1
     i32.sub
    end
    local.tee $0
    i32.const 1
    i32.shl
    local.get $7
    i32.add
    i32.const 2
    call $~lib/rt/stub/__new
    local.tee $6
    local.get $7
    i32.add
    local.set $5
    local.get $3
    i64.extend_i32_u
    local.set $2
    local.get $1
    i64.extend_i32_s
    local.set $4
    local.get $1
    local.get $1
    i32.const 1
    i32.sub
    i32.and
    if
     loop $do-loop|1
      local.get $5
      local.get $0
      i32.const 1
      i32.sub
      local.tee $0
      i32.const 1
      i32.shl
      i32.add
      local.get $2
      local.get $2
      local.get $4
      i64.div_u
      local.tee $2
      local.get $4
      i64.mul
      i64.sub
      i32.wrap_i64
      i32.const 1
      i32.shl
      i32.const 4224
      i32.add
      i32.load16_u
      i32.store16
      local.get $2
      i64.const 0
      i64.ne
      br_if $do-loop|1
     end
    else
     local.get $1
     i32.ctz
     i32.const 7
     i32.and
     i64.extend_i32_s
     local.set $8
     local.get $4
     i64.const 1
     i64.sub
     local.set $4
     loop $do-loop|0
      local.get $5
      local.get $0
      i32.const 1
      i32.sub
      local.tee $0
      i32.const 1
      i32.shl
      i32.add
      local.get $2
      local.get $4
      i64.and
      i32.wrap_i64
      i32.const 1
      i32.shl
      i32.const 4224
      i32.add
      i32.load16_u
      i32.store16
      local.get $2
      local.get $8
      i64.shr_u
      local.tee $2
      i64.const 0
      i64.ne
      br_if $do-loop|0
     end
    end
   end
  end
  local.get $7
  if
   local.get $6
   i32.const 45
   i32.store16
  end
  local.get $6
 )
 (func $~lib/array/Array<assembly/types/GameState/CardInstance>#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 2272
   i32.const 2224
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.tee $0
  i32.eqz
  if
   i32.const 4688
   i32.const 2224
   i32.const 118
   i32.const 40
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
 )
 (func $assembly/util/stableStringify/escapeJsonString (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  i32.const 5776
  local.set $1
  loop $for-loop|0
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.tee $2
   local.get $5
   i32.gt_s
   if
    local.get $2
    local.get $5
    i32.le_u
    if (result i32)
     i32.const -1
    else
     local.get $0
     local.get $5
     i32.const 1
     i32.shl
     i32.add
     i32.load16_u
    end
    local.tee $3
    i32.const 34
    i32.eq
    if (result i32)
     local.get $1
     i32.const 5808
     call $~lib/string/String.__concat
    else
     local.get $3
     i32.const 92
     i32.eq
     if (result i32)
      local.get $1
      i32.const 5840
      call $~lib/string/String.__concat
     else
      local.get $3
      i32.const 10
      i32.eq
      if (result i32)
       local.get $1
       i32.const 5872
       call $~lib/string/String.__concat
      else
       local.get $3
       i32.const 13
       i32.eq
       if (result i32)
        local.get $1
        i32.const 5904
        call $~lib/string/String.__concat
       else
        local.get $3
        i32.const 9
        i32.eq
        if (result i32)
         local.get $1
         i32.const 5936
         call $~lib/string/String.__concat
        else
         local.get $3
         i32.const 32
         i32.lt_s
         if (result i32)
          local.get $1
          local.get $3
          i32.const 16
          call $~lib/util/number/itoa32
          local.tee $1
          i32.const 20
          i32.sub
          i32.load offset=16
          i32.const -2
          i32.and
          local.set $8
          i32.const 2732
          i32.load
          i32.const -2
          i32.and
          local.tee $4
          i32.eqz
          local.get $8
          i32.const 8
          i32.gt_u
          i32.or
          i32.eqz
          if
           i32.const 8
           i32.const 2
           call $~lib/rt/stub/__new
           local.set $3
           i32.const 8
           local.get $8
           i32.sub
           local.tee $6
           local.get $4
           i32.gt_u
           if
            local.get $6
            local.get $6
            i32.const 2
            i32.sub
            local.get $4
            i32.div_u
            local.get $4
            i32.mul
            local.tee $10
            i32.sub
            local.set $9
            i32.const 0
            local.set $7
            loop $while-continue|0
             local.get $7
             local.get $10
             i32.lt_u
             if
              local.get $3
              local.get $7
              i32.add
              i32.const 2736
              local.get $4
              memory.copy
              local.get $4
              local.get $7
              i32.add
              local.set $7
              br $while-continue|0
             end
            end
            local.get $3
            local.get $10
            i32.add
            i32.const 2736
            local.get $9
            memory.copy
           else
            local.get $3
            i32.const 2736
            local.get $6
            memory.copy
           end
           local.get $3
           local.get $6
           i32.add
           local.get $1
           local.get $8
           memory.copy
           local.get $3
           local.set $1
          end
          i32.const 5968
          local.get $1
          call $~lib/string/String.__concat
          call $~lib/string/String.__concat
         else
          i32.const 1
          global.set $~argumentsLength
          i32.const 2
          i32.const 2
          call $~lib/rt/stub/__new
          local.tee $2
          local.get $3
          i32.store16
          local.get $1
          local.get $2
          call $~lib/string/String.__concat
         end
        end
       end
      end
     end
    end
    local.set $1
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|0
   end
  end
  local.get $1
  i32.const 5776
  call $~lib/string/String.__concat
 )
 (func $assembly/engine/stateSerializer/serializeCard (param $0 i32) (result i32)
  i32.const 2464
  i32.const 4816
  local.get $0
  i32.load offset=40
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4880
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=24
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4992
  local.get $0
  i32.load offset=4
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5040
  local.get $0
  i32.load offset=8
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5104
  local.get $0
  i32.load offset=20
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5168
  local.get $0
  i32.load offset=12
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5232
  local.get $0
  i32.load offset=48
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5296
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=26
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5360
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=32
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5408
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=27
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5472
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=35
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5536
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=34
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5600
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=36
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5664
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=33
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 5728
  local.get $0
  i32.load
  call $assembly/util/stableStringify/escapeJsonString
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6000
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=53
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6048
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=28
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6096
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=57
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6144
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=54
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6208
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=44
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6272
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=52
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6336
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=31
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6384
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=29
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6432
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=25
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6496
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=30
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6544
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=56
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6608
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=55
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6656
  local.get $0
  i32.load offset=16
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6704
  i32.const 4928
  i32.const 4960
  local.get $0
  i32.load8_u offset=37
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6752
  call $~lib/string/String.__concat
 )
 (func $assembly/engine/stateSerializer/serializeCardArray (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  i32.const 4624
  local.set $1
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    local.get $2
    i32.const 0
    i32.gt_s
    if (result i32)
     local.get $1
     i32.const 4656
     call $~lib/string/String.__concat
    else
     local.get $1
    end
    local.get $0
    local.get $2
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    call $assembly/engine/stateSerializer/serializeCard
    call $~lib/string/String.__concat
    local.set $1
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $1
  i32.const 6784
  call $~lib/string/String.__concat
 )
 (func $~lib/array/Array<i32>#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 2272
   i32.const 2224
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
 )
 (func $assembly/engine/stateSerializer/serializePlayer (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  i32.const 2464
  i32.const 4480
  local.get $0
  i32.load offset=68
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4560
  local.get $0
  i32.load offset=12
  call $assembly/engine/stateSerializer/serializeCardArray
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6816
  local.get $0
  i32.load offset=64
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  local.get $0
  i32.load offset=16
  local.set $3
  i32.const 4624
  local.set $1
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.load offset=12
   i32.lt_s
   if
    local.get $2
    i32.const 0
    i32.gt_s
    if (result i32)
     local.get $1
     i32.const 4656
     call $~lib/string/String.__concat
    else
     local.get $1
    end
    local.get $3
    local.get $2
    call $~lib/array/Array<i32>#__get
    i32.const 10
    call $~lib/util/number/itoa32
    call $~lib/string/String.__concat
    local.set $1
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  i32.const 6896
  local.get $1
  i32.const 6784
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6944
  local.get $0
  i32.load offset=72
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7008
  local.get $0
  i32.load offset=20
  call $assembly/engine/stateSerializer/serializeCardArray
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7056
  local.get $0
  i32.load offset=8
  call $assembly/engine/stateSerializer/serializeCardArray
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7104
  local.get $0
  i32.load offset=40
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7152
  local.get $0
  i32.load offset=52
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7200
  local.get $0
  i32.load offset=56
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7248
  local.get $0
  i32.load offset=44
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7296
  local.get $0
  i32.load offset=76
  call $assembly/util/stableStringify/escapeJsonString
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7344
  i32.const 2464
  i32.const 7392
  local.get $0
  i32.load offset=60
  local.tee $1
  i32.load offset=4
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7440
  local.get $1
  i32.load
  call $assembly/util/stableStringify/escapeJsonString
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7488
  i32.const 4928
  i32.const 4960
  local.get $1
  i32.load8_u offset=8
  select
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6752
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7536
  local.get $0
  i32.load
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7568
  i32.const 2464
  i32.const 7616
  local.get $0
  i32.load offset=36
  local.tee $1
  i32.load
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7664
  local.get $1
  i32.load offset=4
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7712
  local.get $1
  i32.load offset=8
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7760
  local.get $1
  i32.load offset=12
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6752
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6656
  local.get $0
  i32.load offset=48
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7440
  local.get $0
  i32.load offset=4
  call $assembly/util/stableStringify/escapeJsonString
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7824
  local.get $0
  i32.load offset=24
  call $assembly/engine/stateSerializer/serializeCardArray
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7872
  local.get $0
  i32.load offset=28
  local.tee $0
  if (result i32)
   local.get $0
   call $assembly/engine/stateSerializer/serializeCard
  else
   i32.const 7920
  end
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6752
  call $~lib/string/String.__concat
 )
 (func $assembly/engine/stateSerializer/serializeGameState (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 2464
  i32.const 2496
  local.get $0
  i32.load offset=8
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4320
  local.get $0
  i32.load offset=16
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4368
  local.get $0
  i32.load offset=28
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 4432
  local.get $0
  i32.load offset=4
  call $assembly/engine/stateSerializer/serializePlayer
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 7952
  local.get $0
  i32.load
  call $assembly/engine/stateSerializer/serializePlayer
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 8000
  local.get $0
  i32.load offset=24
  local.tee $1
  if (result i32)
   local.get $1
   i32.const 100000
   i32.lt_u
   if (result i32)
    local.get $1
    i32.const 100
    i32.lt_u
    if (result i32)
     local.get $1
     i32.const 10
     i32.ge_u
     i32.const 1
     i32.add
    else
     local.get $1
     i32.const 10000
     i32.ge_u
     i32.const 3
     i32.add
     local.get $1
     i32.const 1000
     i32.ge_u
     i32.add
    end
   else
    local.get $1
    i32.const 10000000
    i32.lt_u
    if (result i32)
     local.get $1
     i32.const 1000000
     i32.ge_u
     i32.const 6
     i32.add
    else
     local.get $1
     i32.const 1000000000
     i32.ge_u
     i32.const 8
     i32.add
     local.get $1
     i32.const 100000000
     i32.ge_u
     i32.add
    end
   end
   local.tee $2
   i32.const 1
   i32.shl
   i32.const 2
   call $~lib/rt/stub/__new
   local.tee $3
   local.get $1
   local.get $2
   call $~lib/util/number/utoa32_dec_lut
   local.get $3
  else
   i32.const 2736
  end
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 8048
  local.get $0
  i32.load offset=12
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 8096
  local.get $0
  i32.load offset=20
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
  call $~lib/string/String.__concat
  i32.const 6752
  call $~lib/string/String.__concat
 )
 (func $assembly/index/computeCanonicalHash (param $0 i32) (result i32)
  local.get $0
  call $assembly/engine/stateSerializer/serializeGameState
  call $assembly/util/sha256/sha256
 )
 (func $assembly/index/getEngineVersion (result i32)
  i32.const 8144
 )
 (func $assembly/index/_start
 )
 (func $assembly/types/GameState/ManaPool#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 16
  i32.const 16
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=12
  local.get $2
 )
 (func $assembly/types/GameState/HeroPower#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 9
  i32.const 17
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store8 offset=8
  local.get $2
  local.get $0
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store8 offset=8
  local.get $2
 )
 (func $assembly/types/GameState/Player#constructor (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 80
  i32.const 13
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.store offset=12
  local.get $1
  i32.const 0
  i32.store offset=16
  local.get $1
  i32.const 0
  i32.store offset=20
  local.get $1
  i32.const 0
  i32.store offset=24
  local.get $1
  i32.const 0
  i32.store offset=28
  local.get $1
  i32.const 0
  i32.store offset=32
  local.get $1
  i32.const 0
  i32.store offset=36
  local.get $1
  i32.const 0
  i32.store offset=40
  local.get $1
  i32.const 0
  i32.store offset=44
  local.get $1
  i32.const 0
  i32.store offset=48
  local.get $1
  i32.const 0
  i32.store offset=52
  local.get $1
  i32.const 0
  i32.store offset=56
  local.get $1
  i32.const 0
  i32.store offset=60
  local.get $1
  i32.const 0
  i32.store offset=64
  local.get $1
  i32.const 0
  i32.store offset=68
  local.get $1
  i32.const 0
  i32.store offset=72
  local.get $1
  i32.const 0
  i32.store offset=76
  local.get $1
  local.get $0
  i32.store
  local.get $1
  i32.const 2160
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.const 2
  i32.const 15
  i32.const 8176
  call $~lib/rt/__newArray
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.const 2
  i32.const 15
  i32.const 8208
  call $~lib/rt/__newArray
  i32.store offset=12
  local.get $1
  i32.const 0
  i32.const 2
  i32.const 8
  i32.const 8240
  call $~lib/rt/__newArray
  i32.store offset=16
  local.get $1
  i32.const 0
  i32.const 2
  i32.const 15
  i32.const 8272
  call $~lib/rt/__newArray
  i32.store offset=20
  local.get $1
  i32.const 0
  i32.const 2
  i32.const 15
  i32.const 8304
  call $~lib/rt/__newArray
  i32.store offset=24
  local.get $1
  i32.const 0
  i32.store offset=28
  local.get $1
  i32.const 0
  i32.store offset=32
  local.get $1
  i32.const 1
  i32.const 1
  call $assembly/types/GameState/ManaPool#constructor
  i32.store offset=36
  local.get $1
  i32.const 30
  i32.store offset=40
  local.get $1
  i32.const 30
  i32.store offset=44
  local.get $1
  i32.const 30
  i32.store offset=48
  local.get $1
  i32.const 0
  i32.store offset=52
  local.get $1
  i32.const 11
  i32.store offset=56
  local.get $1
  i32.const 2160
  i32.const 2
  call $assembly/types/GameState/HeroPower#constructor
  i32.store offset=60
  local.get $1
  i32.const 0
  i32.store offset=64
  local.get $1
  i32.const 0
  i32.store offset=68
  local.get $1
  i32.const 0
  i32.store offset=72
  local.get $1
  i32.const 2160
  i32.store offset=76
  local.get $1
 )
 (func $assembly/index/createGameState (result i32)
  (local $0 i32)
  i32.const 32
  i32.const 12
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 0
  i32.store offset=28
  local.get $0
  i32.const 0
  call $assembly/types/GameState/Player#constructor
  i32.store
  local.get $0
  i32.const 1
  call $assembly/types/GameState/Player#constructor
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 1
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const -1
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 0
  i32.store offset=28
  local.get $0
 )
 (func $assembly/index/createPlayer (param $0 i32) (result i32)
  local.get $0
  call $assembly/types/GameState/Player#constructor
 )
 (func $assembly/index/createManaPool (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $assembly/types/GameState/ManaPool#constructor
 )
 (func $assembly/index/createHeroPower (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $assembly/types/GameState/HeroPower#constructor
 )
 (func $assembly/types/GameState/CardInstance#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 58
  i32.const 14
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=12
  local.get $2
  i32.const 0
  i32.store offset=16
  local.get $2
  i32.const 0
  i32.store offset=20
  local.get $2
  i32.const 0
  i32.store8 offset=24
  local.get $2
  i32.const 0
  i32.store8 offset=25
  local.get $2
  i32.const 0
  i32.store8 offset=26
  local.get $2
  i32.const 0
  i32.store8 offset=27
  local.get $2
  i32.const 0
  i32.store8 offset=28
  local.get $2
  i32.const 0
  i32.store8 offset=29
  local.get $2
  i32.const 0
  i32.store8 offset=30
  local.get $2
  i32.const 0
  i32.store8 offset=31
  local.get $2
  i32.const 0
  i32.store8 offset=32
  local.get $2
  i32.const 0
  i32.store8 offset=33
  local.get $2
  i32.const 0
  i32.store8 offset=34
  local.get $2
  i32.const 0
  i32.store8 offset=35
  local.get $2
  i32.const 0
  i32.store8 offset=36
  local.get $2
  i32.const 0
  i32.store8 offset=37
  local.get $2
  i32.const 0
  i32.store offset=40
  local.get $2
  i32.const 0
  i32.store8 offset=44
  local.get $2
  i32.const 0
  i32.store offset=48
  local.get $2
  i32.const 0
  i32.store8 offset=52
  local.get $2
  i32.const 0
  i32.store8 offset=53
  local.get $2
  i32.const 0
  i32.store8 offset=54
  local.get $2
  i32.const 0
  i32.store8 offset=55
  local.get $2
  i32.const 0
  i32.store8 offset=56
  local.get $2
  i32.const 0
  i32.store8 offset=57
  local.get $2
  local.get $0
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=12
  local.get $2
  i32.const 0
  i32.store offset=16
  local.get $2
  i32.const 0
  i32.store offset=20
  local.get $2
  i32.const 0
  i32.store8 offset=24
  local.get $2
  i32.const 1
  i32.store8 offset=25
  local.get $2
  i32.const 0
  i32.store8 offset=26
  local.get $2
  i32.const 0
  i32.store8 offset=27
  local.get $2
  i32.const 0
  i32.store8 offset=28
  local.get $2
  i32.const 0
  i32.store8 offset=29
  local.get $2
  i32.const 0
  i32.store8 offset=30
  local.get $2
  i32.const 0
  i32.store8 offset=31
  local.get $2
  i32.const 0
  i32.store8 offset=32
  local.get $2
  i32.const 0
  i32.store8 offset=33
  local.get $2
  i32.const 0
  i32.store8 offset=34
  local.get $2
  i32.const 0
  i32.store8 offset=35
  local.get $2
  i32.const 0
  i32.store8 offset=36
  local.get $2
  i32.const 0
  i32.store8 offset=37
  local.get $2
  i32.const 0
  i32.store offset=40
  local.get $2
  i32.const 1
  i32.store8 offset=44
  local.get $2
  i32.const 3
  i32.store offset=48
  local.get $2
  i32.const 0
  i32.store8 offset=52
  local.get $2
  i32.const 0
  i32.store8 offset=53
  local.get $2
  i32.const 0
  i32.store8 offset=54
  local.get $2
  i32.const 0
  i32.store8 offset=55
  local.get $2
  i32.const 0
  i32.store8 offset=56
  local.get $2
  i32.const 0
  i32.store8 offset=57
  local.get $2
 )
 (func $assembly/index/createCardInstance (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $assembly/types/GameState/CardInstance#constructor
 )
 (func $assembly/index/createEngineAction (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 20
  i32.const 18
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.store offset=12
  local.get $1
  i32.const 0
  i32.store offset=16
  local.get $1
  local.get $0
  i32.store
  local.get $1
  i32.const 2160
  i32.store offset=4
  local.get $1
  i32.const 2160
  i32.store offset=8
  local.get $1
  i32.const 2160
  i32.store offset=12
  local.get $1
  i32.const 2160
  i32.store offset=16
  local.get $1
 )
 (func $~lib/string/String.__eq (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  local.get $1
  i32.eq
  if
   i32.const 1
   return
  end
  local.get $1
  i32.eqz
  local.get $0
  i32.eqz
  i32.or
  if
   i32.const 0
   return
  end
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.tee $3
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.ne
  if
   i32.const 0
   return
  end
  local.get $0
  local.set $2
  local.get $3
  local.tee $0
  i32.const 4
  i32.ge_u
  if (result i32)
   local.get $2
   i32.const 7
   i32.and
   local.get $1
   i32.const 7
   i32.and
   i32.or
  else
   i32.const 1
  end
  i32.eqz
  if
   loop $do-loop|0
    local.get $2
    i64.load
    local.get $1
    i64.load
    i64.eq
    if
     local.get $2
     i32.const 8
     i32.add
     local.set $2
     local.get $1
     i32.const 8
     i32.add
     local.set $1
     local.get $0
     i32.const 4
     i32.sub
     local.tee $0
     i32.const 4
     i32.ge_u
     br_if $do-loop|0
    end
   end
  end
  block $__inlined_func$~lib/util/string/compareImpl$288
   loop $while-continue|1
    local.get $0
    local.tee $3
    i32.const 1
    i32.sub
    local.set $0
    local.get $3
    if
     local.get $2
     i32.load16_u
     local.tee $5
     local.get $1
     i32.load16_u
     local.tee $4
     i32.sub
     local.set $3
     local.get $4
     local.get $5
     i32.ne
     br_if $__inlined_func$~lib/util/string/compareImpl$288
     local.get $2
     i32.const 2
     i32.add
     local.set $2
     local.get $1
     i32.const 2
     i32.add
     local.set $1
     br $while-continue|1
    end
   end
   i32.const 0
   local.set $3
  end
  local.get $3
  i32.eqz
 )
 (func $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get" (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.load
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  i32.const 15
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  i32.const 13
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  i32.const 16
  i32.shr_u
  local.get $0
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $0
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1366"
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load
      local.get $1
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1366"
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   i32.const 8384
   i32.const 8448
   i32.const 105
   i32.const 17
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
 )
 (func $~lib/array/Array<assembly/types/GameState/CardInstance>#splice (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  i32.const 1
  local.get $0
  i32.load offset=12
  local.tee $2
  local.get $1
  i32.const 0
  i32.lt_s
  if (result i32)
   local.get $1
   local.get $2
   i32.add
   local.tee $1
   i32.const 0
   local.get $1
   i32.const 0
   i32.gt_s
   select
  else
   local.get $1
   local.get $2
   local.get $1
   local.get $2
   i32.lt_s
   select
  end
  local.tee $5
  i32.sub
  local.tee $1
  local.get $1
  i32.const 1
  i32.gt_s
  select
  local.tee $1
  i32.const 0
  local.get $1
  i32.const 0
  i32.gt_s
  select
  local.tee $4
  i32.const 2
  i32.const 15
  i32.const 0
  call $~lib/rt/__newArray
  local.tee $6
  i32.load offset=4
  local.get $0
  i32.load offset=4
  local.tee $1
  local.get $5
  i32.const 2
  i32.shl
  i32.add
  local.tee $3
  local.get $4
  i32.const 2
  i32.shl
  memory.copy
  local.get $2
  local.get $4
  local.get $5
  i32.add
  local.tee $5
  i32.ne
  if
   local.get $3
   local.get $1
   local.get $5
   i32.const 2
   i32.shl
   i32.add
   local.get $2
   local.get $5
   i32.sub
   i32.const 2
   i32.shl
   memory.copy
  end
  local.get $0
  local.get $2
  local.get $4
  i32.sub
  i32.store offset=12
  local.get $6
 )
 (func $~lib/array/Array<assembly/types/GameState/CardInstance>#push (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 1
  i32.add
  local.tee $3
  i32.const 2
  i32.const 1
  call $~lib/array/ensureCapacity
  local.get $0
  i32.load offset=4
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store
  local.get $0
  local.get $3
  i32.store offset=12
 )
 (func $assembly/types/GameState/GameState#nextInstanceId (param $0 i32) (result i32)
  local.get $0
  local.get $0
  i32.load offset=28
  i32.const 1
  i32.add
  i32.store offset=28
  i32.const 8896
  local.get $0
  i32.load offset=28
  i32.const 10
  call $~lib/util/number/itoa32
  call $~lib/string/String.__concat
 )
 (func $assembly/engine/drawEngine/drawCardForPlayer (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  local.get $1
  i32.load offset=16
  i32.load offset=12
  i32.eqz
  if
   local.get $1
   local.get $1
   i32.load offset=72
   i32.const 1
   i32.add
   i32.store offset=72
   local.get $1
   local.get $1
   i32.load offset=44
   local.get $1
   i32.load offset=72
   local.tee $0
   i32.sub
   i32.store offset=44
   local.get $1
   local.get $1
   i32.load offset=40
   local.get $0
   i32.sub
   i32.store offset=40
   return
  end
  local.get $1
  i32.load offset=16
  local.tee $5
  i32.load offset=12
  local.tee $2
  i32.const 0
  i32.le_s
  if
   i32.const 8848
   i32.const 2224
   i32.const 330
   i32.const 18
   call $~lib/builtins/abort
   unreachable
  end
  local.get $5
  i32.load offset=4
  local.tee $6
  i32.load
  local.set $4
  local.get $6
  local.get $6
  i32.const 4
  i32.add
  local.get $2
  i32.const 1
  i32.sub
  local.tee $7
  i32.const 2
  i32.shl
  local.tee $2
  memory.copy
  local.get $2
  local.get $6
  i32.add
  i32.const 0
  i32.store
  local.get $5
  local.get $7
  i32.store offset=12
  local.get $1
  i32.load offset=8
  i32.load offset=12
  i32.const 7
  i32.ge_s
  if
   return
  end
  global.get $assembly/util/cardLookup/cardRegistry
  local.tee $2
  i32.load
  local.get $2
  i32.load offset=4
  local.get $4
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $2
  local.get $2
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $2
  local.get $2
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $2
  local.get $2
  i32.const 16
  i32.shr_u
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $2
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
   loop $while-continue|0
    local.get $2
    if
     local.get $2
     i32.load offset=8
     local.tee $5
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $2
      i32.load
      local.get $4
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
     local.get $5
     i32.const -2
     i32.and
     local.set $2
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $2
  end
  local.get $2
  if (result i32)
   global.get $assembly/util/cardLookup/cardRegistry
   local.get $4
   call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get"
  else
   i32.const 0
  end
  local.set $2
  local.get $0
  call $assembly/types/GameState/GameState#nextInstanceId
  local.get $4
  call $assembly/types/GameState/CardInstance#constructor
  local.set $0
  local.get $2
  if
   local.get $0
   local.get $2
   i32.load offset=16
   i32.store offset=8
   local.get $0
   local.get $2
   i32.load offset=20
   i32.store offset=12
   local.get $0
   local.get $2
   i32.load offset=20
   i32.store offset=16
   local.get $0
   local.get $2
   i32.load offset=20
   i32.store offset=20
   local.get $0
   local.get $1
   i32.load
   i32.eqz
   i32.store8 offset=44
   local.get $2
   i32.load offset=36
   local.set $2
   loop $for-loop|0
    local.get $3
    local.get $2
    i32.load offset=12
    i32.lt_s
    if
     local.get $2
     local.get $3
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     local.tee $4
     i32.const 8928
     call $~lib/string/String.__eq
     if
      local.get $0
      i32.const 1
      i32.store8 offset=30
     else
      local.get $4
      i32.const 8960
      call $~lib/string/String.__eq
      if
       local.get $0
       i32.const 1
       i32.store8 offset=32
       local.get $0
       i32.const 0
       i32.store8 offset=25
       local.get $0
       i32.const 1
       i32.store8 offset=24
      else
       local.get $4
       i32.const 8992
       call $~lib/string/String.__eq
       if
        local.get $0
        i32.const 1
        i32.store8 offset=31
        local.get $0
        i32.const 0
        i32.store8 offset=25
        local.get $0
        i32.const 1
        i32.store8 offset=24
       else
        local.get $4
        i32.const 9024
        call $~lib/string/String.__eq
        if
         local.get $0
         i32.const 1
         i32.store8 offset=27
        else
         local.get $4
         i32.const 9072
         call $~lib/string/String.__eq
         if
          local.get $0
          i32.const 1
          i32.store8 offset=29
         else
          local.get $4
          i32.const 9120
          call $~lib/string/String.__eq
          if
           local.get $0
           i32.const 1
           i32.store8 offset=33
          else
           local.get $4
           i32.const 9168
           call $~lib/string/String.__eq
           if
            local.get $0
            i32.const 1
            i32.store8 offset=34
           else
            local.get $4
            i32.const 9216
            call $~lib/string/String.__eq
            if
             local.get $0
             i32.const 1
             i32.store8 offset=35
            else
             local.get $4
             i32.const 9264
             call $~lib/string/String.__eq
             if
              local.get $0
              i32.const 1
              i32.store8 offset=36
             end
            end
           end
          end
         end
        end
       end
      end
     end
     local.get $3
     i32.const 1
     i32.add
     local.set $3
     br $for-loop|0
    end
   end
  end
  local.get $1
  i32.load offset=8
  local.get $0
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
 )
 (func $assembly/effects/effectInterpreter/applyDamageAll (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  i32.load offset=4
  local.set $1
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.load
   i32.load offset=12
   local.tee $4
   i32.load offset=12
   i32.lt_s
   if
    local.get $4
    local.get $2
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    local.set $4
    block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1408
     local.get $1
     i32.const 0
     i32.le_s
     br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1408
     local.get $1
     i32.const 3
     i32.add
     local.get $1
     local.get $4
     i32.load8_u offset=56
     select
     local.tee $5
     i32.const 3
     i32.add
     local.get $5
     local.get $4
     i32.load8_u offset=53
     select
     local.set $5
     local.get $4
     i32.load8_u offset=27
     if
      local.get $4
      i32.const 0
      i32.store8 offset=27
      br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1408
     end
     local.get $4
     local.get $4
     i32.load offset=12
     local.get $5
     i32.sub
     i32.store offset=12
    end
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $0
   i32.load offset=4
   i32.load offset=12
   local.tee $2
   i32.load offset=12
   i32.lt_s
   if
    local.get $2
    local.get $3
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    local.set $2
    block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1410
     local.get $1
     i32.const 0
     i32.le_s
     br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1410
     local.get $1
     i32.const 3
     i32.add
     local.get $1
     local.get $2
     i32.load8_u offset=56
     select
     local.tee $4
     i32.const 3
     i32.add
     local.get $4
     local.get $2
     i32.load8_u offset=53
     select
     local.set $4
     local.get $2
     i32.load8_u offset=27
     if
      local.get $2
      i32.const 0
      i32.store8 offset=27
      br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1410
     end
     local.get $2
     local.get $2
     i32.load offset=12
     local.get $4
     i32.sub
     i32.store offset=12
    end
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|1
   end
  end
  local.get $0
  i32.load
  local.set $3
  block $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$6
   local.get $1
   local.tee $2
   i32.const 0
   i32.le_s
   br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$6
   local.get $3
   i32.load offset=52
   local.tee $4
   i32.const 0
   i32.gt_s
   if
    local.get $1
    local.get $4
    i32.le_s
    if
     local.get $3
     local.get $4
     local.get $1
     i32.sub
     i32.store offset=52
     br $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$6
    end
    local.get $2
    local.get $3
    i32.load offset=52
    i32.sub
    local.set $2
    local.get $3
    i32.const 0
    i32.store offset=52
   end
   local.get $3
   local.get $3
   i32.load offset=44
   local.get $2
   i32.sub
   i32.store offset=44
   local.get $3
   local.get $3
   i32.load offset=40
   local.get $2
   i32.sub
   i32.store offset=40
  end
  local.get $0
  i32.load offset=4
  local.set $0
  block $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$7
   local.get $1
   i32.const 0
   i32.le_s
   br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$7
   local.get $0
   i32.load offset=52
   local.tee $2
   i32.const 0
   i32.gt_s
   if
    local.get $1
    local.get $2
    i32.le_s
    if
     local.get $0
     local.get $2
     local.get $1
     i32.sub
     i32.store offset=52
     br $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$7
    end
    local.get $1
    local.get $0
    i32.load offset=52
    i32.sub
    local.set $1
    local.get $0
    i32.const 0
    i32.store offset=52
   end
   local.get $0
   local.get $0
   i32.load offset=44
   local.get $1
   i32.sub
   i32.store offset=44
   local.get $0
   local.get $0
   i32.load offset=40
   local.get $1
   i32.sub
   i32.store offset=40
  end
 )
 (func $assembly/types/GameState/EffectDef#constructor (result i32)
  (local $0 i32)
  i32.const 32
  i32.const 6
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 0
  i32.store offset=28
  local.get $0
  i32.const 2160
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 2160
  i32.store offset=12
  local.get $0
  i32.const 10288
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 5
  i32.const 10320
  call $~lib/rt/__newArray
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 1
  i32.store offset=28
  local.get $0
 )
 (func $assembly/effects/effectInterpreter/executeEffect (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  local.get $3
  i32.load
  local.tee $9
  i32.const 8496
  call $~lib/string/String.__eq
  if
   block $__inlined_func$assembly/effects/effectInterpreter/applyDamage$31
    i32.const 0
    local.set $4
    local.get $3
    i32.load offset=4
    local.set $0
    local.get $3
    i32.load offset=12
    i32.const 8528
    call $~lib/string/String.__eq
    if (result i32)
     i32.const 1
    else
     local.get $5
     i32.const 8528
     call $~lib/string/String.__eq
    end
    if
     local.get $0
     i32.const 0
     i32.le_s
     br_if $__inlined_func$assembly/effects/effectInterpreter/applyDamage$31
     local.get $2
     i32.load offset=52
     local.tee $1
     i32.const 0
     i32.gt_s
     if
      local.get $0
      local.get $1
      i32.le_s
      if
       local.get $2
       local.get $1
       local.get $0
       i32.sub
       i32.store offset=52
       br $__inlined_func$assembly/effects/effectInterpreter/applyDamage$31
      end
      local.get $0
      local.get $2
      i32.load offset=52
      i32.sub
      local.set $0
      local.get $2
      i32.const 0
      i32.store offset=52
     end
     local.get $2
     local.get $2
     i32.load offset=44
     local.get $0
     i32.sub
     i32.store offset=44
     local.get $2
     local.get $2
     i32.load offset=40
     local.get $0
     i32.sub
     i32.store offset=40
     br $__inlined_func$assembly/effects/effectInterpreter/applyDamage$31
    end
    block $folding-inner0
     loop $for-loop|0
      local.get $4
      local.get $2
      i32.load offset=12
      local.tee $3
      i32.load offset=12
      i32.lt_s
      if
       local.get $3
       local.get $4
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       i32.load
       local.get $5
       call $~lib/string/String.__eq
       if
        local.get $2
        i32.load offset=12
        local.get $4
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        local.set $1
        br $folding-inner0
       end
       local.get $4
       i32.const 1
       i32.add
       local.set $4
       br $for-loop|0
      end
     end
     loop $for-loop|1
      local.get $7
      local.get $1
      i32.load offset=12
      local.tee $2
      i32.load offset=12
      i32.lt_s
      if
       local.get $2
       local.get $7
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       i32.load
       local.get $5
       call $~lib/string/String.__eq
       if
        local.get $1
        i32.load offset=12
        local.get $7
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        local.set $1
        br $folding-inner0
       end
       local.get $7
       i32.const 1
       i32.add
       local.set $7
       br $for-loop|1
      end
     end
     br $__inlined_func$assembly/effects/effectInterpreter/applyDamage$31
    end
    block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1368
     local.get $0
     i32.const 0
     i32.le_s
     br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1368
     local.get $0
     i32.const 3
     i32.add
     local.get $0
     local.get $1
     i32.load8_u offset=56
     select
     local.tee $0
     i32.const 3
     i32.add
     local.get $0
     local.get $1
     i32.load8_u offset=53
     select
     local.set $0
     local.get $1
     i32.load8_u offset=27
     if
      local.get $1
      i32.const 0
      i32.store8 offset=27
      br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1368
     end
     local.get $1
     local.get $1
     i32.load offset=12
     local.get $0
     i32.sub
     i32.store offset=12
    end
   end
  else
   local.get $9
   i32.const 8560
   call $~lib/string/String.__eq
   if
    i32.const 0
    local.set $4
    i32.const 0
    local.set $5
    local.get $3
    i32.load offset=4
    local.set $0
    local.get $3
    i32.load offset=12
    i32.const 8608
    call $~lib/string/String.__eq
    if
     loop $for-loop|00
      local.get $5
      local.get $1
      i32.load offset=12
      local.tee $3
      i32.load offset=12
      i32.lt_s
      if
       local.get $3
       local.get $5
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $3
       block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1372
        local.get $0
        i32.const 0
        i32.le_s
        br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1372
        local.get $0
        i32.const 3
        i32.add
        local.get $0
        local.get $3
        i32.load8_u offset=56
        select
        local.tee $4
        i32.const 3
        i32.add
        local.get $4
        local.get $3
        i32.load8_u offset=53
        select
        local.set $4
        local.get $3
        i32.load8_u offset=27
        if
         local.get $3
         i32.const 0
         i32.store8 offset=27
         br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1372
        end
        local.get $3
        local.get $3
        i32.load offset=12
        local.get $4
        i32.sub
        i32.store offset=12
       end
       local.get $5
       i32.const 1
       i32.add
       local.set $5
       br $for-loop|00
      end
     end
     loop $for-loop|11
      local.get $7
      local.get $2
      i32.load offset=12
      local.tee $1
      i32.load offset=12
      i32.lt_s
      if
       local.get $1
       local.get $7
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $1
       block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1374
        local.get $0
        i32.const 0
        i32.le_s
        br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1374
        local.get $0
        i32.const 3
        i32.add
        local.get $0
        local.get $1
        i32.load8_u offset=56
        select
        local.tee $3
        i32.const 3
        i32.add
        local.get $3
        local.get $1
        i32.load8_u offset=53
        select
        local.set $3
        local.get $1
        i32.load8_u offset=27
        if
         local.get $1
         i32.const 0
         i32.store8 offset=27
         br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1374
        end
        local.get $1
        local.get $1
        i32.load offset=12
        local.get $3
        i32.sub
        i32.store offset=12
       end
       local.get $7
       i32.const 1
       i32.add
       local.set $7
       br $for-loop|11
      end
     end
    else
     loop $for-loop|2
      local.get $4
      local.get $2
      i32.load offset=12
      local.tee $1
      i32.load offset=12
      i32.lt_s
      if
       local.get $1
       local.get $4
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $1
       block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1376
        local.get $0
        i32.const 0
        i32.le_s
        br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1376
        local.get $0
        i32.const 3
        i32.add
        local.get $0
        local.get $1
        i32.load8_u offset=56
        select
        local.tee $3
        i32.const 3
        i32.add
        local.get $3
        local.get $1
        i32.load8_u offset=53
        select
        local.set $3
        local.get $1
        i32.load8_u offset=27
        if
         local.get $1
         i32.const 0
         i32.store8 offset=27
         br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1376
        end
        local.get $1
        local.get $1
        i32.load offset=12
        local.get $3
        i32.sub
        i32.store offset=12
       end
       local.get $4
       i32.const 1
       i32.add
       local.set $4
       br $for-loop|2
      end
     end
    end
   else
    local.get $9
    i32.const 8656
    call $~lib/string/String.__eq
    if
     block $__inlined_func$assembly/effects/effectInterpreter/applyHeal$9
      i32.const 0
      local.set $0
      local.get $3
      i32.load offset=4
      local.set $2
      local.get $3
      i32.load offset=12
      i32.const 8528
      call $~lib/string/String.__eq
      if (result i32)
       i32.const 1
      else
       local.get $5
       i32.const 8528
       call $~lib/string/String.__eq
      end
      if (result i32)
       i32.const 1
      else
       local.get $5
       i32.const 2160
       call $~lib/string/String.__eq
      end
      if
       local.get $1
       local.get $1
       i32.load offset=44
       local.get $2
       i32.add
       i32.store offset=44
       local.get $1
       local.get $1
       i32.load offset=40
       local.get $2
       i32.add
       i32.store offset=40
       local.get $1
       i32.load offset=48
       local.tee $0
       local.get $1
       i32.load offset=44
       i32.lt_s
       if
        local.get $1
        local.get $0
        i32.store offset=44
        local.get $1
        local.get $1
        i32.load offset=48
        i32.store offset=40
       end
       br $__inlined_func$assembly/effects/effectInterpreter/applyHeal$9
      end
      loop $for-loop|002
       local.get $0
       local.get $1
       i32.load offset=12
       local.tee $3
       i32.load offset=12
       i32.lt_s
       if
        local.get $3
        local.get $0
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.load
        local.get $5
        call $~lib/string/String.__eq
        if
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=12
         local.get $2
         i32.add
         i32.store offset=12
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=12
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=16
         i32.gt_s
         if
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=16
          i32.store offset=12
         end
         br $__inlined_func$assembly/effects/effectInterpreter/applyHeal$9
        end
        local.get $0
        i32.const 1
        i32.add
        local.set $0
        br $for-loop|002
       end
      end
     end
    else
     local.get $9
     i32.const 8688
     call $~lib/string/String.__eq
     if
      block $__inlined_func$assembly/effects/effectInterpreter/applyBuff$10
       i32.const 0
       local.set $0
       local.get $3
       i32.load offset=4
       local.set $2
       local.get $3
       i32.load offset=8
       local.set $4
       local.get $3
       i32.load offset=12
       i32.const 8720
       call $~lib/string/String.__eq
       if
        loop $for-loop|01
         local.get $0
         local.get $1
         i32.load offset=12
         local.tee $3
         i32.load offset=12
         i32.lt_s
         if
          local.get $3
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=8
          local.get $2
          i32.add
          i32.store offset=8
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=12
          local.get $4
          i32.add
          i32.store offset=12
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=16
          local.get $4
          i32.add
          i32.store offset=16
          local.get $0
          i32.const 1
          i32.add
          local.set $0
          br $for-loop|01
         end
        end
        br $__inlined_func$assembly/effects/effectInterpreter/applyBuff$10
       end
       loop $for-loop|12
        local.get $0
        local.get $1
        i32.load offset=12
        local.tee $3
        i32.load offset=12
        i32.lt_s
        if
         local.get $3
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load
         local.get $5
         call $~lib/string/String.__eq
         if
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=8
          local.get $2
          i32.add
          i32.store offset=8
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=12
          local.get $4
          i32.add
          i32.store offset=12
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          local.get $1
          i32.load offset=12
          local.get $0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.load offset=16
          local.get $4
          i32.add
          i32.store offset=16
          br $__inlined_func$assembly/effects/effectInterpreter/applyBuff$10
         end
         local.get $0
         i32.const 1
         i32.add
         local.set $0
         br $for-loop|12
        end
       end
      end
     else
      local.get $9
      i32.const 8768
      call $~lib/string/String.__eq
      if
       block $__inlined_func$assembly/effects/effectInterpreter/applyBuffAdjacent$11
        i32.const 0
        local.set $2
        i32.const -1
        local.set $0
        loop $for-loop|03
         local.get $2
         local.get $1
         i32.load offset=12
         local.tee $5
         i32.load offset=12
         i32.lt_s
         if
          block $for-break0
           local.get $5
           local.get $2
           call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
           i32.load
           local.get $4
           i32.load
           call $~lib/string/String.__eq
           if
            local.get $2
            local.set $0
            br $for-break0
           end
           local.get $2
           i32.const 1
           i32.add
           local.set $2
           br $for-loop|03
          end
         end
        end
        local.get $0
        i32.const -1
        i32.eq
        br_if $__inlined_func$assembly/effects/effectInterpreter/applyBuffAdjacent$11
        local.get $0
        i32.const 0
        i32.gt_s
        if
         local.get $1
         i32.load offset=12
         local.get $0
         i32.const 1
         i32.sub
         local.tee $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=8
         local.get $3
         i32.load offset=4
         i32.add
         i32.store offset=8
         local.get $1
         i32.load offset=12
         local.get $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=12
         local.get $3
         i32.load offset=8
         i32.add
         i32.store offset=12
         local.get $1
         i32.load offset=12
         local.get $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $2
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=16
         local.get $3
         i32.load offset=8
         i32.add
         i32.store offset=16
        end
        local.get $0
        local.get $1
        i32.load offset=12
        local.tee $2
        i32.load offset=12
        i32.const 1
        i32.sub
        i32.lt_s
        if
         local.get $2
         local.get $0
         i32.const 1
         i32.add
         local.tee $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=8
         local.get $3
         i32.load offset=4
         i32.add
         i32.store offset=8
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=12
         local.get $3
         i32.load offset=8
         i32.add
         i32.store offset=12
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         local.get $1
         i32.load offset=12
         local.get $0
         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
         i32.load offset=16
         local.get $3
         i32.load offset=8
         i32.add
         i32.store offset=16
        end
       end
      else
       local.get $9
       i32.const 8816
       call $~lib/string/String.__eq
       if
        local.get $3
        i32.load offset=4
        local.tee $2
        i32.const 0
        i32.le_s
        if
         i32.const 1
         local.set $2
        end
        loop $for-loop|04
         local.get $2
         local.get $6
         i32.gt_s
         if
          local.get $0
          local.get $1
          call $assembly/engine/drawEngine/drawCardForPlayer
          local.get $6
          i32.const 1
          i32.add
          local.set $6
          br $for-loop|04
         end
        end
       else
        local.get $9
        i32.const 9312
        call $~lib/string/String.__eq
        if
         local.get $3
         i32.load offset=24
         local.set $4
         local.get $3
         i32.load offset=28
         local.tee $2
         i32.const 0
         i32.le_s
         if
          i32.const 1
          local.set $2
         end
         global.get $assembly/util/cardLookup/cardRegistry
         local.tee $3
         i32.load
         local.get $3
         i32.load offset=4
         local.get $4
         i32.const -1028477379
         i32.mul
         i32.const 374761397
         i32.add
         i32.const 17
         i32.rotl
         i32.const 668265263
         i32.mul
         local.tee $3
         local.get $3
         i32.const 15
         i32.shr_u
         i32.xor
         i32.const -2048144777
         i32.mul
         local.tee $3
         local.get $3
         i32.const 13
         i32.shr_u
         i32.xor
         i32.const -1028477379
         i32.mul
         local.tee $3
         local.get $3
         i32.const 16
         i32.shr_u
         i32.xor
         i32.and
         i32.const 2
         i32.shl
         i32.add
         i32.load
         local.set $3
         block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
          loop $while-continue|0
           local.get $3
           if
            local.get $3
            i32.load offset=8
            local.tee $5
            i32.const 1
            i32.and
            if (result i32)
             i32.const 0
            else
             local.get $3
             i32.load
             local.get $4
             i32.eq
            end
            br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
            local.get $5
            i32.const -2
            i32.and
            local.set $3
            br $while-continue|0
           end
          end
          i32.const 0
          local.set $3
         end
         local.get $3
         if (result i32)
          global.get $assembly/util/cardLookup/cardRegistry
          local.get $4
          call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get"
         else
          i32.const 0
         end
         local.set $3
         loop $for-loop|05
          local.get $2
          local.get $8
          i32.gt_s
          if
           local.get $1
           i32.load offset=12
           i32.load offset=12
           i32.const 5
           i32.lt_s
           if
            local.get $0
            call $assembly/types/GameState/GameState#nextInstanceId
            local.get $4
            call $assembly/types/GameState/CardInstance#constructor
            local.set $5
            local.get $3
            if
             local.get $5
             local.get $3
             i32.load offset=16
             i32.store offset=8
             local.get $5
             local.get $3
             i32.load offset=20
             i32.store offset=12
             local.get $5
             local.get $3
             i32.load offset=20
             i32.store offset=16
             local.get $5
             local.get $1
             i32.load
             i32.eqz
             i32.store8 offset=44
             i32.const 0
             local.set $7
             loop $for-loop|16
              local.get $7
              local.get $3
              i32.load offset=36
              local.tee $6
              i32.load offset=12
              i32.lt_s
              if
               local.get $6
               local.get $7
               call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
               local.tee $6
               i32.const 8928
               call $~lib/string/String.__eq
               if
                local.get $5
                i32.const 1
                i32.store8 offset=30
               else
                local.get $6
                i32.const 8960
                call $~lib/string/String.__eq
                if
                 local.get $5
                 i32.const 1
                 i32.store8 offset=32
                 local.get $5
                 i32.const 0
                 i32.store8 offset=25
                 local.get $5
                 i32.const 1
                 i32.store8 offset=24
                else
                 local.get $6
                 i32.const 8992
                 call $~lib/string/String.__eq
                 if
                  local.get $5
                  i32.const 1
                  i32.store8 offset=31
                  local.get $5
                  i32.const 0
                  i32.store8 offset=25
                  local.get $5
                  i32.const 1
                  i32.store8 offset=24
                 else
                  local.get $6
                  i32.const 9024
                  call $~lib/string/String.__eq
                  if
                   local.get $5
                   i32.const 1
                   i32.store8 offset=27
                  else
                   local.get $6
                   i32.const 9072
                   call $~lib/string/String.__eq
                   if
                    local.get $5
                    i32.const 1
                    i32.store8 offset=29
                   else
                    local.get $6
                    i32.const 9120
                    call $~lib/string/String.__eq
                    if
                     local.get $5
                     i32.const 1
                     i32.store8 offset=33
                    else
                     local.get $6
                     i32.const 9216
                     call $~lib/string/String.__eq
                     if
                      local.get $5
                      i32.const 1
                      i32.store8 offset=35
                     else
                      local.get $6
                      i32.const 9264
                      call $~lib/string/String.__eq
                      if
                       local.get $5
                       i32.const 1
                       i32.store8 offset=36
                      end
                     end
                    end
                   end
                  end
                 end
                end
               end
               local.get $7
               i32.const 1
               i32.add
               local.set $7
               br $for-loop|16
              end
             end
            end
            local.get $5
            i32.const 1
            i32.store8 offset=25
            local.get $1
            i32.load offset=12
            local.get $5
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
            local.get $8
            i32.const 1
            i32.add
            local.set $8
            br $for-loop|05
           end
          end
         end
        else
         local.get $9
         i32.const 9344
         call $~lib/string/String.__eq
         if
          block $__inlined_func$assembly/effects/effectInterpreter/applyDestroy$1590
           loop $for-loop|007
            local.get $6
            local.get $2
            i32.load offset=12
            local.tee $0
            i32.load offset=12
            i32.lt_s
            if
             local.get $0
             local.get $6
             call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
             i32.load
             local.get $5
             call $~lib/string/String.__eq
             if
              local.get $2
              i32.load offset=12
              local.get $6
              call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
              i32.const 0
              i32.store offset=12
              br $__inlined_func$assembly/effects/effectInterpreter/applyDestroy$1590
             end
             local.get $6
             i32.const 1
             i32.add
             local.set $6
             br $for-loop|007
            end
           end
           loop $for-loop|18
            local.get $8
            local.get $1
            i32.load offset=12
            local.tee $0
            i32.load offset=12
            i32.lt_s
            if
             local.get $0
             local.get $8
             call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
             i32.load
             local.get $5
             call $~lib/string/String.__eq
             if
              local.get $1
              i32.load offset=12
              local.get $8
              call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
              i32.const 0
              i32.store offset=12
              br $__inlined_func$assembly/effects/effectInterpreter/applyDestroy$1590
             end
             local.get $8
             i32.const 1
             i32.add
             local.set $8
             br $for-loop|18
            end
           end
          end
         else
          local.get $9
          i32.const 9392
          call $~lib/string/String.__eq
          if
           block $__inlined_func$assembly/effects/effectInterpreter/applyTransform$1591
            global.get $assembly/util/cardLookup/cardRegistry
            local.tee $4
            i32.load
            local.get $4
            i32.load offset=4
            local.get $3
            i32.load offset=24
            local.tee $3
            i32.const -1028477379
            i32.mul
            i32.const 374761397
            i32.add
            i32.const 17
            i32.rotl
            i32.const 668265263
            i32.mul
            local.tee $4
            local.get $4
            i32.const 15
            i32.shr_u
            i32.xor
            i32.const -2048144777
            i32.mul
            local.tee $4
            local.get $4
            i32.const 13
            i32.shr_u
            i32.xor
            i32.const -1028477379
            i32.mul
            local.tee $4
            local.get $4
            i32.const 16
            i32.shr_u
            i32.xor
            i32.and
            i32.const 2
            i32.shl
            i32.add
            i32.load
            local.set $7
            block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13650"
             loop $while-continue|01
              local.get $7
              if
               local.get $7
               i32.load offset=8
               local.tee $4
               i32.const 1
               i32.and
               if (result i32)
                i32.const 0
               else
                local.get $7
                i32.load
                local.get $3
                i32.eq
               end
               br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13650"
               local.get $4
               i32.const -2
               i32.and
               local.set $7
               br $while-continue|01
              end
             end
             i32.const 0
             local.set $7
            end
            local.get $7
            if (result i32)
             global.get $assembly/util/cardLookup/cardRegistry
             local.get $3
             call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get"
            else
             i32.const 0
            end
            local.tee $4
            i32.eqz
            br_if $__inlined_func$assembly/effects/effectInterpreter/applyTransform$1591
            i32.const 2
            i32.const 2
            i32.const 20
            i32.const 0
            call $~lib/rt/__newArray
            local.tee $7
            i32.const 0
            local.get $1
            call $~lib/array/Array<u32>#__set
            local.get $7
            i32.const 1
            local.get $2
            call $~lib/array/Array<u32>#__set
            loop $for-loop|019
             local.get $6
             local.get $7
             i32.load offset=12
             i32.lt_s
             if
              local.get $7
              local.get $6
              call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
              i32.load offset=12
              local.set $2
              i32.const 0
              local.set $1
              loop $for-loop|13
               local.get $1
               local.get $2
               i32.load offset=12
               i32.lt_s
               if
                local.get $2
                local.get $1
                call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                i32.load
                local.get $5
                call $~lib/string/String.__eq
                if
                 local.get $0
                 call $assembly/types/GameState/GameState#nextInstanceId
                 local.get $3
                 call $assembly/types/GameState/CardInstance#constructor
                 local.tee $0
                 local.get $4
                 i32.load offset=16
                 i32.store offset=8
                 local.get $0
                 local.get $4
                 i32.load offset=20
                 i32.store offset=12
                 local.get $0
                 local.get $4
                 i32.load offset=20
                 i32.store offset=16
                 local.get $0
                 local.get $2
                 local.get $1
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 i32.load8_u offset=44
                 i32.store8 offset=44
                 local.get $0
                 i32.const 1
                 i32.store8 offset=25
                 local.get $2
                 local.get $1
                 local.get $0
                 call $~lib/array/Array<u32>#__set
                 br $__inlined_func$assembly/effects/effectInterpreter/applyTransform$1591
                end
                local.get $1
                i32.const 1
                i32.add
                local.set $1
                br $for-loop|13
               end
              end
              local.get $6
              i32.const 1
              i32.add
              local.set $6
              br $for-loop|019
             end
            end
           end
          else
           local.get $9
           i32.const 9440
           call $~lib/string/String.__eq
           if
            local.get $1
            local.get $1
            i32.load offset=52
            local.get $3
            i32.load offset=4
            i32.add
            i32.store offset=52
           else
            local.get $9
            i32.const 9488
            call $~lib/string/String.__eq
            if
             block $__inlined_func$assembly/effects/effectInterpreter/applyGrantKeyword$13
              i32.const 0
              local.set $0
              i32.const 0
              local.set $2
              local.get $3
              i32.load offset=20
              local.set $3
              loop $for-loop|010
               local.get $0
               local.get $1
               i32.load offset=12
               local.tee $4
               i32.load offset=12
               i32.lt_s
               if
                local.get $4
                local.get $0
                call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                i32.load
                local.get $5
                call $~lib/string/String.__eq
                if
                 local.get $1
                 i32.load offset=12
                 local.get $0
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 local.set $0
                 loop $for-loop|0011
                  local.get $2
                  local.get $3
                  i32.load offset=12
                  i32.lt_s
                  if
                   local.get $3
                   local.get $2
                   call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                   local.tee $1
                   i32.const 8928
                   call $~lib/string/String.__eq
                   if
                    local.get $0
                    i32.const 1
                    i32.store8 offset=30
                   else
                    local.get $1
                    i32.const 9024
                    call $~lib/string/String.__eq
                    if
                     local.get $0
                     i32.const 1
                     i32.store8 offset=27
                    else
                     local.get $1
                     i32.const 9072
                     call $~lib/string/String.__eq
                     if
                      local.get $0
                      i32.const 1
                      i32.store8 offset=29
                     else
                      local.get $1
                      i32.const 9120
                      call $~lib/string/String.__eq
                      if
                       local.get $0
                       i32.const 1
                       i32.store8 offset=33
                      else
                       local.get $1
                       i32.const 9216
                       call $~lib/string/String.__eq
                       if
                        local.get $0
                        i32.const 1
                        i32.store8 offset=35
                       else
                        local.get $1
                        i32.const 9264
                        call $~lib/string/String.__eq
                        if
                         local.get $0
                         i32.const 1
                         i32.store8 offset=36
                        else
                         local.get $1
                         i32.const 8960
                         call $~lib/string/String.__eq
                         if
                          local.get $0
                          i32.const 1
                          i32.store8 offset=32
                          local.get $0
                          i32.const 0
                          i32.store8 offset=25
                          local.get $0
                          i32.const 1
                          i32.store8 offset=24
                         else
                          local.get $1
                          i32.const 8992
                          call $~lib/string/String.__eq
                          if
                           local.get $0
                           i32.const 1
                           i32.store8 offset=31
                           local.get $0
                           i32.const 0
                           i32.store8 offset=25
                           local.get $0
                           i32.const 1
                           i32.store8 offset=24
                          end
                         end
                        end
                       end
                      end
                     end
                    end
                   end
                   local.get $2
                   i32.const 1
                   i32.add
                   local.set $2
                   br $for-loop|0011
                  end
                 end
                 br $__inlined_func$assembly/effects/effectInterpreter/applyGrantKeyword$13
                end
                local.get $0
                i32.const 1
                i32.add
                local.set $0
                br $for-loop|010
               end
              end
             end
            else
             local.get $9
             i32.const 9536
             call $~lib/string/String.__eq
             if
              block $__inlined_func$assembly/effects/effectInterpreter/applySetStats$1592
               loop $for-loop|0512
                local.get $6
                local.get $1
                i32.load offset=12
                local.tee $0
                i32.load offset=12
                i32.lt_s
                if
                 local.get $0
                 local.get $6
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 i32.load
                 local.get $5
                 call $~lib/string/String.__eq
                 if
                  local.get $1
                  i32.load offset=12
                  local.get $6
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=4
                  i32.store offset=8
                  local.get $1
                  i32.load offset=12
                  local.get $6
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=8
                  i32.store offset=12
                  local.get $1
                  i32.load offset=12
                  local.get $6
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=8
                  i32.store offset=16
                  br $__inlined_func$assembly/effects/effectInterpreter/applySetStats$1592
                 end
                 local.get $6
                 i32.const 1
                 i32.add
                 local.set $6
                 br $for-loop|0512
                end
               end
               loop $for-loop|17
                local.get $8
                local.get $2
                i32.load offset=12
                local.tee $0
                i32.load offset=12
                i32.lt_s
                if
                 local.get $0
                 local.get $8
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 i32.load
                 local.get $5
                 call $~lib/string/String.__eq
                 if
                  local.get $2
                  i32.load offset=12
                  local.get $8
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=4
                  i32.store offset=8
                  local.get $2
                  i32.load offset=12
                  local.get $8
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=8
                  i32.store offset=12
                  local.get $2
                  i32.load offset=12
                  local.get $8
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  local.get $3
                  i32.load offset=8
                  i32.store offset=16
                  br $__inlined_func$assembly/effects/effectInterpreter/applySetStats$1592
                 end
                 local.get $8
                 i32.const 1
                 i32.add
                 local.set $8
                 br $for-loop|17
                end
               end
              end
             else
              local.get $9
              i32.const 9584
              call $~lib/string/String.__eq
              if
               block $__inlined_func$assembly/effects/effectInterpreter/applyFreeze$1593
                local.get $3
                i32.load offset=12
                i32.const 9616
                call $~lib/string/String.__eq
                if
                 loop $for-loop|09
                  local.get $6
                  local.get $2
                  i32.load offset=12
                  local.tee $0
                  i32.load offset=12
                  i32.lt_s
                  if
                   local.get $0
                   local.get $6
                   call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                   i32.const 1
                   i32.store8 offset=28
                   local.get $6
                   i32.const 1
                   i32.add
                   local.set $6
                   br $for-loop|09
                  end
                 end
                 br $__inlined_func$assembly/effects/effectInterpreter/applyFreeze$1593
                end
                loop $for-loop|111
                 local.get $6
                 local.get $2
                 i32.load offset=12
                 local.tee $0
                 i32.load offset=12
                 i32.lt_s
                 if
                  local.get $0
                  local.get $6
                  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                  i32.load
                  local.get $5
                  call $~lib/string/String.__eq
                  if
                   local.get $2
                   i32.load offset=12
                   local.get $6
                   call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                   i32.const 1
                   i32.store8 offset=28
                   br $__inlined_func$assembly/effects/effectInterpreter/applyFreeze$1593
                  end
                  local.get $6
                  i32.const 1
                  i32.add
                  local.set $6
                  br $for-loop|111
                 end
                end
               end
              else
               local.get $9
               i32.const 9664
               call $~lib/string/String.__eq
               if
                block $__inlined_func$assembly/effects/effectInterpreter/applySilence$14
                 i32.const 0
                 local.set $3
                 i32.const 2
                 i32.const 2
                 i32.const 20
                 i32.const 0
                 call $~lib/rt/__newArray
                 local.tee $0
                 i32.const 0
                 local.get $1
                 call $~lib/array/Array<u32>#__set
                 local.get $0
                 i32.const 1
                 local.get $2
                 call $~lib/array/Array<u32>#__set
                 loop $for-loop|013
                  local.get $3
                  local.get $0
                  i32.load offset=12
                  i32.lt_s
                  if
                   local.get $0
                   local.get $3
                   call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                   i32.load offset=12
                   local.set $2
                   i32.const 0
                   local.set $1
                   loop $for-loop|114
                    local.get $1
                    local.get $2
                    i32.load offset=12
                    i32.lt_s
                    if
                     local.get $2
                     local.get $1
                     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                     i32.load
                     local.get $5
                     call $~lib/string/String.__eq
                     if
                      local.get $2
                      local.get $1
                      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                      local.tee $0
                      i32.const 1
                      i32.store8 offset=37
                      local.get $0
                      i32.const 0
                      i32.store8 offset=30
                      local.get $0
                      i32.const 0
                      i32.store8 offset=27
                      local.get $0
                      i32.const 0
                      i32.store8 offset=29
                      local.get $0
                      i32.const 0
                      i32.store8 offset=33
                      local.get $0
                      i32.const 0
                      i32.store8 offset=34
                      local.get $0
                      i32.const 0
                      i32.store8 offset=35
                      local.get $0
                      i32.const 0
                      i32.store8 offset=36
                      local.get $0
                      i32.const 0
                      i32.store8 offset=32
                      local.get $0
                      i32.const 0
                      i32.store8 offset=31
                      local.get $0
                      i32.const 0
                      i32.store8 offset=28
                      local.get $0
                      i32.const 0
                      i32.store8 offset=52
                      local.get $0
                      i32.const 0
                      i32.store8 offset=53
                      local.get $0
                      i32.const 0
                      i32.store8 offset=54
                      local.get $0
                      i32.const 0
                      i32.store8 offset=55
                      local.get $0
                      i32.const 0
                      i32.store8 offset=56
                      local.get $0
                      i32.const 0
                      i32.store8 offset=57
                      br $__inlined_func$assembly/effects/effectInterpreter/applySilence$14
                     end
                     local.get $1
                     i32.const 1
                     i32.add
                     local.set $1
                     br $for-loop|114
                    end
                   end
                   local.get $3
                   i32.const 1
                   i32.add
                   local.set $3
                   br $for-loop|013
                  end
                 end
                end
               else
                local.get $9
                i32.const 9712
                call $~lib/string/String.__eq
                if
                 local.get $3
                 i32.load offset=12
                 i32.const 9760
                 call $~lib/string/String.__eq
                 if
                  local.get $1
                  i32.load offset=36
                  local.tee $0
                  local.get $0
                  i32.load
                  local.get $3
                  i32.load offset=4
                  i32.add
                  i32.store
                  local.get $1
                  i32.load offset=36
                  i32.load offset=4
                  local.tee $0
                  local.get $1
                  i32.load offset=36
                  i32.load
                  i32.lt_s
                  if
                   local.get $1
                   i32.load offset=36
                   local.get $0
                   i32.store
                  end
                 else
                  local.get $3
                  i32.load offset=12
                  i32.const 9792
                  call $~lib/string/String.__eq
                  if
                   local.get $1
                   i32.load offset=36
                   local.tee $0
                   local.get $0
                   i32.load offset=4
                   local.get $3
                   i32.load offset=4
                   i32.add
                   i32.store offset=4
                   local.get $1
                   i32.load offset=36
                   i32.load offset=4
                   i32.const 10
                   i32.gt_s
                   if
                    local.get $1
                    i32.load offset=36
                    i32.const 10
                    i32.store offset=4
                   end
                   local.get $1
                   i32.load offset=36
                   local.tee $0
                   local.get $0
                   i32.load
                   local.get $3
                   i32.load offset=4
                   i32.add
                   i32.store
                  else
                   local.get $3
                   i32.load offset=12
                   i32.const 9840
                   call $~lib/string/String.__eq
                   if
                    local.get $1
                    i32.load offset=36
                    local.get $3
                    i32.load offset=4
                    i32.store
                   end
                  end
                 end
                else
                 local.get $9
                 i32.const 9872
                 call $~lib/string/String.__eq
                 if
                  block $__inlined_func$assembly/effects/effectInterpreter/applyReturnToHand$1594
                   i32.const 2
                   i32.const 2
                   i32.const 20
                   i32.const 0
                   call $~lib/rt/__newArray
                   local.tee $0
                   i32.const 0
                   local.get $1
                   call $~lib/array/Array<u32>#__set
                   local.get $0
                   i32.const 1
                   local.get $2
                   call $~lib/array/Array<u32>#__set
                   loop $for-loop|01315
                    local.get $6
                    local.get $0
                    i32.load offset=12
                    i32.lt_s
                    if
                     local.get $0
                     local.get $6
                     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                     local.set $2
                     i32.const 0
                     local.set $1
                     loop $for-loop|115
                      local.get $1
                      local.get $2
                      i32.load offset=12
                      local.tee $3
                      i32.load offset=12
                      i32.lt_s
                      if
                       local.get $3
                       local.get $1
                       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                       i32.load
                       local.get $5
                       call $~lib/string/String.__eq
                       if
                        local.get $2
                        i32.load offset=8
                        local.tee $0
                        i32.load offset=12
                        i32.const 7
                        i32.lt_s
                        if
                         local.get $0
                         local.get $2
                         i32.load offset=12
                         local.get $1
                         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                         call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
                        end
                        local.get $2
                        i32.load offset=12
                        local.get $1
                        call $~lib/array/Array<assembly/types/GameState/CardInstance>#splice
                        drop
                        br $__inlined_func$assembly/effects/effectInterpreter/applyReturnToHand$1594
                       end
                       local.get $1
                       i32.const 1
                       i32.add
                       local.set $1
                       br $for-loop|115
                      end
                     end
                     local.get $6
                     i32.const 1
                     i32.add
                     local.set $6
                     br $for-loop|01315
                    end
                   end
                  end
                 else
                  local.get $9
                  i32.const 9920
                  call $~lib/string/String.__eq
                  if
                   block $__inlined_func$assembly/effects/effectInterpreter/applyCopyToHand$15
                    i32.const 0
                    local.set $4
                    local.get $1
                    i32.load offset=8
                    i32.load offset=12
                    i32.const 7
                    i32.ge_s
                    br_if $__inlined_func$assembly/effects/effectInterpreter/applyCopyToHand$15
                    i32.const 2
                    i32.const 2
                    i32.const 20
                    i32.const 0
                    call $~lib/rt/__newArray
                    local.tee $3
                    i32.const 0
                    local.get $1
                    call $~lib/array/Array<u32>#__set
                    local.get $3
                    i32.const 1
                    local.get $2
                    call $~lib/array/Array<u32>#__set
                    loop $for-loop|016
                     local.get $4
                     local.get $3
                     i32.load offset=12
                     i32.lt_s
                     if
                      i32.const 0
                      local.set $2
                      loop $for-loop|117
                       local.get $2
                       local.get $3
                       local.get $4
                       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                       i32.load offset=12
                       i32.load offset=12
                       i32.lt_s
                       if
                        local.get $3
                        local.get $4
                        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                        i32.load offset=12
                        local.get $2
                        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                        i32.load
                        local.get $5
                        call $~lib/string/String.__eq
                        if
                         local.get $3
                         local.get $4
                         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                         i32.load offset=12
                         local.get $2
                         call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                         local.set $2
                         local.get $0
                         call $assembly/types/GameState/GameState#nextInstanceId
                         local.get $2
                         i32.load offset=4
                         call $assembly/types/GameState/CardInstance#constructor
                         local.set $0
                         global.get $assembly/util/cardLookup/cardRegistry
                         local.tee $3
                         i32.load
                         local.get $3
                         i32.load offset=4
                         local.get $2
                         i32.load offset=4
                         local.tee $2
                         i32.const -1028477379
                         i32.mul
                         i32.const 374761397
                         i32.add
                         i32.const 17
                         i32.rotl
                         i32.const 668265263
                         i32.mul
                         local.tee $3
                         local.get $3
                         i32.const 15
                         i32.shr_u
                         i32.xor
                         i32.const -2048144777
                         i32.mul
                         local.tee $3
                         local.get $3
                         i32.const 13
                         i32.shr_u
                         i32.xor
                         i32.const -1028477379
                         i32.mul
                         local.tee $3
                         local.get $3
                         i32.const 16
                         i32.shr_u
                         i32.xor
                         i32.and
                         i32.const 2
                         i32.shl
                         i32.add
                         i32.load
                         local.set $5
                         block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13652"
                          loop $while-continue|03
                           local.get $5
                           if
                            local.get $5
                            i32.load offset=8
                            local.tee $3
                            i32.const 1
                            i32.and
                            if (result i32)
                             i32.const 0
                            else
                             local.get $5
                             i32.load
                             local.get $2
                             i32.eq
                            end
                            br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13652"
                            local.get $3
                            i32.const -2
                            i32.and
                            local.set $5
                            br $while-continue|03
                           end
                          end
                          i32.const 0
                          local.set $5
                         end
                         local.get $5
                         if (result i32)
                          global.get $assembly/util/cardLookup/cardRegistry
                          local.get $2
                          call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get"
                         else
                          i32.const 0
                         end
                         local.tee $2
                         if
                          local.get $0
                          local.get $2
                          i32.load offset=16
                          i32.store offset=8
                          local.get $0
                          local.get $2
                          i32.load offset=20
                          i32.store offset=12
                          local.get $0
                          local.get $2
                          i32.load offset=20
                          i32.store offset=16
                         end
                         local.get $0
                         local.get $1
                         i32.load
                         i32.eqz
                         i32.store8 offset=44
                         local.get $1
                         i32.load offset=8
                         local.get $0
                         call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
                         br $__inlined_func$assembly/effects/effectInterpreter/applyCopyToHand$15
                        end
                        local.get $2
                        i32.const 1
                        i32.add
                        local.set $2
                        br $for-loop|117
                       end
                      end
                      local.get $4
                      i32.const 1
                      i32.add
                      local.set $4
                      br $for-loop|016
                     end
                    end
                   end
                  else
                   local.get $9
                   i32.const 9968
                   call $~lib/string/String.__eq
                   if
                    local.get $0
                    local.get $3
                    call $assembly/effects/effectInterpreter/applyDamageAll
                   else
                    local.get $9
                    i32.const 10016
                    call $~lib/string/String.__eq
                    if
                     local.get $2
                     i32.load offset=12
                     i32.load offset=12
                     if
                      local.get $0
                      i32.load offset=24
                      local.set $1
                      i32.const 4
                      i32.const 21
                      call $~lib/rt/stub/__new
                      local.tee $4
                      i32.const 0
                      i32.store
                      local.get $4
                      local.get $1
                      i32.store
                      local.get $2
                      i32.load offset=12
                      i32.load offset=12
                      local.set $1
                      local.get $4
                      local.get $4
                      i32.load
                      i32.const 1831565813
                      i32.add
                      i32.store
                      local.get $4
                      i32.load
                      i32.const 1
                      i32.or
                      local.get $4
                      i32.load
                      local.tee $5
                      i32.const 15
                      i32.shr_u
                      local.get $5
                      i32.xor
                      i32.mul
                      local.tee $5
                      local.get $5
                      i32.const 61
                      i32.or
                      local.get $5
                      local.get $5
                      i32.const 7
                      i32.shr_u
                      i32.xor
                      i32.mul
                      local.get $5
                      i32.add
                      i32.xor
                      local.set $5
                      local.get $0
                      local.get $4
                      i32.load
                      i32.store offset=24
                      local.get $2
                      i32.load offset=12
                      local.get $5
                      i32.const 14
                      i32.shr_u
                      local.get $5
                      i32.xor
                      f64.convert_i32_u
                      f64.const 2.3283064365386963e-10
                      f64.mul
                      local.get $1
                      f64.convert_i32_s
                      f64.mul
                      f64.floor
                      i32.trunc_sat_f64_s
                      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                      local.set $0
                      block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1416
                       local.get $3
                       i32.load offset=4
                       local.tee $1
                       i32.const 0
                       i32.le_s
                       br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1416
                       local.get $1
                       i32.const 3
                       i32.add
                       local.get $1
                       local.get $0
                       i32.load8_u offset=56
                       select
                       local.tee $1
                       i32.const 3
                       i32.add
                       local.get $1
                       local.get $0
                       i32.load8_u offset=53
                       select
                       local.set $1
                       local.get $0
                       i32.load8_u offset=27
                       if
                        local.get $0
                        i32.const 0
                        i32.store8 offset=27
                        br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1416
                       end
                       local.get $0
                       local.get $0
                       i32.load offset=12
                       local.get $1
                       i32.sub
                       i32.store offset=12
                      end
                     end
                    else
                     local.get $9
                     i32.const 10064
                     call $~lib/string/String.__eq
                     if
                      local.get $3
                      i32.load offset=16
                      i32.const 10112
                      call $~lib/string/String.__eq
                      if (result i32)
                       local.get $1
                       i32.load offset=64
                       i32.const 2
                       i32.ge_s
                      else
                       local.get $3
                       i32.load offset=16
                       i32.const 10144
                       call $~lib/string/String.__eq
                       if (result i32)
                        local.get $1
                        i32.load offset=44
                        local.get $1
                        i32.load offset=48
                        i32.lt_s
                       else
                        local.get $3
                        i32.load offset=16
                        i32.const 10192
                        call $~lib/string/String.__eq
                        if (result i32)
                         local.get $1
                         i32.load offset=8
                         i32.load offset=12
                        else
                         local.get $3
                         i32.load offset=16
                         i32.const 10240
                         call $~lib/string/String.__eq
                         if (result i32)
                          local.get $1
                          i32.load offset=12
                          i32.load offset=12
                         else
                          i32.const 1
                         end
                        end
                        i32.eqz
                       end
                      end
                      if
                       call $assembly/types/GameState/EffectDef#constructor
                       local.tee $6
                       local.get $3
                       i32.load offset=12
                       i32.store
                       local.get $6
                       local.get $3
                       i32.load offset=4
                       i32.store offset=4
                       local.get $6
                       local.get $3
                       i32.load offset=8
                       i32.store offset=8
                       local.get $6
                       i32.const 10352
                       i32.store offset=12
                       local.get $6
                       i32.const 10288
                       i32.store offset=16
                       local.get $6
                       local.get $3
                       i32.load offset=20
                       i32.store offset=20
                       local.get $6
                       local.get $3
                       i32.load offset=24
                       i32.store offset=24
                       local.get $6
                       local.get $3
                       i32.load offset=28
                       i32.store offset=28
                       local.get $0
                       local.get $1
                       local.get $2
                       local.get $6
                       local.get $4
                       local.get $5
                       call $assembly/effects/effectInterpreter/executeEffect
                      end
                     end
                    end
                   end
                  end
                 end
                end
               end
              end
             end
            end
           end
          end
         end
        end
       end
      end
     end
    end
   end
  end
 )
 (func $assembly/engine/combatProcessor/removeDeadMinions (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 0
  i32.const 2
  i32.const 15
  i32.const 10400
  call $~lib/rt/__newArray
  local.set $2
  local.get $0
  i32.load
  i32.load offset=12
  i32.load offset=12
  i32.const 1
  i32.sub
  local.set $1
  loop $while-continue|0
   local.get $1
   i32.const 0
   i32.ge_s
   if
    local.get $0
    i32.load
    i32.load offset=12
    local.get $1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=12
    i32.const 0
    i32.le_s
    if
     local.get $2
     local.get $0
     i32.load
     i32.load offset=12
     local.get $1
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#splice
     local.tee $3
     i32.const 0
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
     local.get $0
     i32.load
     i32.load offset=20
     local.get $3
     i32.const 0
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    end
    local.get $1
    i32.const 1
    i32.sub
    local.set $1
    br $while-continue|0
   end
  end
  local.get $0
  i32.load offset=4
  i32.load offset=12
  i32.load offset=12
  i32.const 1
  i32.sub
  local.set $1
  loop $while-continue|1
   local.get $1
   i32.const 0
   i32.ge_s
   if
    local.get $0
    i32.load offset=4
    i32.load offset=12
    local.get $1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=12
    i32.const 0
    i32.le_s
    if
     local.get $2
     local.get $0
     i32.load offset=4
     i32.load offset=12
     local.get $1
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#splice
     local.tee $3
     i32.const 0
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
     local.get $0
     i32.load offset=4
     i32.load offset=20
     local.get $3
     i32.const 0
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    end
    local.get $1
    i32.const 1
    i32.sub
    local.set $1
    br $while-continue|1
   end
  end
 )
 (func $assembly/engine/cardPlayer/playCard (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load offset=4
  else
   local.get $0
   i32.load
  end
  local.set $8
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load
  else
   local.get $0
   i32.load offset=4
  end
  local.set $7
  i32.const -1
  local.set $3
  loop $for-loop|0
   local.get $4
   local.get $8
   i32.load offset=8
   local.tee $5
   i32.load offset=12
   i32.lt_s
   if
    block $for-break0
     local.get $5
     local.get $4
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.load
     local.get $1
     call $~lib/string/String.__eq
     if
      local.get $4
      local.set $3
      br $for-break0
     end
     local.get $4
     i32.const 1
     i32.add
     local.set $4
     br $for-loop|0
    end
   end
  end
  local.get $3
  i32.const -1
  i32.eq
  if
   i32.const 0
   return
  end
  local.get $8
  i32.load offset=8
  local.get $3
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  local.tee $5
  i32.load offset=4
  local.set $6
  global.get $assembly/util/cardLookup/cardRegistry
  local.tee $1
  i32.load
  local.get $1
  i32.load offset=4
  local.get $6
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $6
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if (result i32)
   global.get $assembly/util/cardLookup/cardRegistry
   local.get $6
   call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#get"
  else
   i32.const 0
  end
  local.tee $4
  i32.eqz
  if
   i32.const 0
   return
  end
  local.get $8
  i32.load offset=36
  i32.load
  local.get $4
  i32.load offset=12
  i32.lt_s
  if
   i32.const 0
   return
  end
  local.get $4
  i32.load offset=8
  i32.eqz
  if
   local.get $8
   i32.load offset=12
   i32.load offset=12
   i32.const 5
   i32.ge_s
   if
    i32.const 0
    return
   end
  end
  local.get $8
  i32.load offset=36
  local.tee $1
  local.get $1
  i32.load
  local.get $4
  i32.load offset=12
  i32.sub
  i32.store
  local.get $8
  i32.load offset=8
  local.get $3
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#splice
  drop
  local.get $4
  i32.load offset=56
  local.tee $1
  i32.const 0
  i32.gt_s
  if
   local.get $8
   i32.load offset=36
   local.get $8
   i32.load offset=36
   i32.load offset=12
   local.get $1
   i32.add
   i32.store offset=12
  end
  local.get $4
  i32.load offset=8
  local.tee $1
  if
   local.get $1
   i32.const 1
   i32.eq
   if
    local.get $4
    i32.load offset=48
    local.tee $1
    if
     local.get $0
     local.get $8
     local.get $7
     local.get $1
     local.get $5
     local.get $2
     call $assembly/effects/effectInterpreter/executeEffect
    end
    local.get $8
    i32.load offset=20
    local.get $5
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
   else
    local.get $4
    i32.load offset=8
    i32.const 2
    i32.eq
    if
     local.get $8
     i32.load offset=28
     local.tee $1
     if
      local.get $8
      i32.load offset=20
      local.get $1
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
     end
     local.get $5
     local.get $4
     i32.load offset=20
     i32.store offset=20
     local.get $5
     local.get $4
     i32.load offset=16
     i32.store offset=8
     local.get $8
     local.get $5
     i32.store offset=28
    else
     local.get $4
     i32.load offset=8
     i32.const 4
     i32.eq
     if
      local.get $8
      i32.load offset=24
      local.get $5
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
     else
      local.get $4
      i32.load offset=8
      i32.const 7
      i32.eq
      if
       local.get $8
       local.get $5
       i32.store offset=32
      else
       local.get $4
       i32.load offset=8
       drop
      end
     end
    end
   end
  else
   local.get $5
   i32.load8_u offset=32
   if
    local.get $5
    i32.const 0
    i32.store8 offset=25
    local.get $5
    i32.const 1
    i32.store8 offset=24
   else
    local.get $5
    i32.const 1
    i32.store8 offset=25
    local.get $5
    local.get $5
    i32.load8_u offset=31
    i32.store8 offset=24
   end
   local.get $8
   i32.load offset=12
   local.get $5
   call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
   local.get $4
   i32.load offset=40
   local.tee $1
   if
    local.get $0
    local.get $8
    local.get $7
    local.get $1
    local.get $5
    local.get $2
    call $assembly/effects/effectInterpreter/executeEffect
   end
  end
  local.get $8
  local.get $8
  i32.load offset=64
  i32.const 1
  i32.add
  i32.store offset=64
  local.get $8
  i32.load offset=64
  i32.const 2
  i32.ge_s
  if (result i32)
   local.get $4
   i32.load offset=52
  else
   i32.const 0
  end
  if
   local.get $0
   local.get $8
   local.get $7
   local.get $4
   i32.load offset=52
   local.get $5
   local.get $2
   call $assembly/effects/effectInterpreter/executeEffect
  end
  local.get $0
  call $assembly/engine/combatProcessor/removeDeadMinions
  local.get $0
  i32.load
  i32.load offset=44
  i32.const 0
  i32.le_s
  if (result i32)
   local.get $0
   i32.load offset=4
   i32.load offset=44
   i32.const 0
   i32.le_s
  else
   i32.const 0
  end
  if
   local.get $0
   i32.const 3
   i32.store offset=16
   local.get $0
   i32.const 1
   i32.store offset=20
  else
   local.get $0
   i32.load
   i32.load offset=44
   i32.const 0
   i32.le_s
   if
    local.get $0
    i32.const 3
    i32.store offset=16
    local.get $0
    i32.const 1
    i32.store offset=20
   else
    local.get $0
    i32.load offset=4
    i32.load offset=44
    i32.const 0
    i32.le_s
    if
     local.get $0
     i32.const 3
     i32.store offset=16
     local.get $0
     i32.const 0
     i32.store offset=20
    end
   end
  end
  i32.const 1
 )
 (func $assembly/engine/combatProcessor/processAttack (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load offset=4
  else
   local.get $0
   i32.load
  end
  local.set $5
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load
  else
   local.get $0
   i32.load offset=4
  end
  local.set $8
  loop $for-loop|0
   local.get $6
   local.get $5
   i32.load offset=12
   local.tee $9
   i32.load offset=12
   i32.lt_s
   if
    block $for-break0
     local.get $9
     local.get $6
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.load
     local.get $1
     call $~lib/string/String.__eq
     if
      local.get $5
      i32.load offset=12
      local.get $6
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      local.set $4
      br $for-break0
     end
     local.get $6
     i32.const 1
     i32.add
     local.set $6
     br $for-loop|0
    end
   end
  end
  local.get $4
  i32.eqz
  if
   i32.const 0
   return
  end
  block $__inlined_func$assembly/engine/combatProcessor/canMinionAttack$1596
   local.get $4
   i32.load8_u offset=28
   br_if $__inlined_func$assembly/engine/combatProcessor/canMinionAttack$1596
   local.get $4
   i32.load8_u offset=25
   if (result i32)
    local.get $4
    i32.load8_u offset=32
   else
    i32.const 1
   end
   if (result i32)
    i32.const 1
   else
    local.get $4
    i32.load8_u offset=31
   end
   i32.eqz
   br_if $__inlined_func$assembly/engine/combatProcessor/canMinionAttack$1596
   local.get $4
   i32.load offset=8
   i32.const 0
   i32.le_s
   br_if $__inlined_func$assembly/engine/combatProcessor/canMinionAttack$1596
   block $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1444 (result i32)
    i32.const 4
    local.get $4
    i32.load8_u offset=34
    br_if $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1444
    drop
    i32.const 2
    local.get $4
    i32.load8_u offset=33
    br_if $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1444
    drop
    i32.const 1
   end
   local.get $4
   i32.load offset=40
   i32.le_s
   br_if $__inlined_func$assembly/engine/combatProcessor/canMinionAttack$1596
   i32.const 1
   local.set $3
  end
  local.get $3
  i32.eqz
  if
   i32.const 0
   return
  end
  i32.const 0
  local.set $1
  local.get $2
  i32.const 8528
  call $~lib/string/String.__eq
  local.tee $3
  i32.eqz
  if
   local.get $2
   i32.const 2160
   call $~lib/string/String.__eq
   local.set $3
  end
  local.get $3
  i32.eqz
  if
   loop $for-loop|1
    local.get $7
    local.get $8
    i32.load offset=12
    local.tee $6
    i32.load offset=12
    i32.lt_s
    if
     block $for-break1
      local.get $6
      local.get $7
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load
      local.get $2
      call $~lib/string/String.__eq
      if
       local.get $8
       i32.load offset=12
       local.get $7
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $1
       br $for-break1
      end
      local.get $7
      i32.const 1
      i32.add
      local.set $7
      br $for-loop|1
     end
    end
   end
   local.get $1
   i32.eqz
   if
    i32.const 0
    return
   end
  end
  i32.const 0
  local.set $7
  i32.const 0
  local.set $2
  loop $for-loop|01
   local.get $2
   local.get $8
   i32.load offset=12
   local.tee $6
   i32.load offset=12
   i32.lt_s
   if
    block $for-break00
     local.get $6
     local.get $2
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.load8_u offset=30
     if (result i32)
      local.get $8
      i32.load offset=12
      local.get $2
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load8_u offset=29
     else
      i32.const 1
     end
     i32.eqz
     if
      i32.const 1
      local.set $7
      br $for-break00
     end
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|01
    end
   end
  end
  block $__inlined_func$assembly/engine/combatProcessor/isValidTarget$1597
   local.get $7
   if
    i32.const 0
    local.set $2
    local.get $3
    br_if $__inlined_func$assembly/engine/combatProcessor/isValidTarget$1597
    local.get $1
    if (result i32)
     local.get $1
     i32.load8_u offset=30
    else
     i32.const 1
    end
    i32.eqz
    br_if $__inlined_func$assembly/engine/combatProcessor/isValidTarget$1597
   end
   local.get $4
   i32.load8_u offset=31
   if (result i32)
    local.get $4
    i32.load8_u offset=25
   else
    i32.const 0
   end
   if
    i32.const 0
    local.set $2
    local.get $3
    br_if $__inlined_func$assembly/engine/combatProcessor/isValidTarget$1597
   end
   i32.const 1
   local.set $2
  end
  local.get $2
  i32.eqz
  if
   i32.const 0
   return
  end
  local.get $4
  i32.load offset=8
  local.tee $2
  i32.const 3
  i32.sub
  local.get $2
  local.get $4
  i32.load8_u offset=55
  select
  local.tee $2
  i32.const 0
  i32.lt_s
  if
   i32.const 0
   local.set $2
  end
  local.get $3
  if
   block $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$19
    local.get $2
    local.tee $1
    i32.const 0
    i32.le_s
    br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$19
    local.get $8
    i32.load offset=52
    local.tee $3
    i32.const 0
    i32.gt_s
    if
     local.get $1
     local.get $3
     i32.le_s
     if
      local.get $8
      local.get $3
      local.get $1
      i32.sub
      i32.store offset=52
      br $__inlined_func$assembly/engine/combatProcessor/dealDamageToHero$19
     end
     local.get $1
     local.get $8
     i32.load offset=52
     i32.sub
     local.set $1
     local.get $8
     i32.const 0
     i32.store offset=52
    end
    local.get $8
    local.get $8
    i32.load offset=44
    local.get $1
    i32.sub
    i32.store offset=44
    local.get $8
    local.get $8
    i32.load offset=40
    local.get $1
    i32.sub
    i32.store offset=40
   end
  else
   local.get $1
   i32.load offset=8
   local.set $3
   block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1450
    local.get $2
    i32.const 0
    i32.le_s
    br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1450
    local.get $2
    i32.const 3
    i32.add
    local.get $2
    local.get $1
    i32.load8_u offset=56
    select
    local.tee $6
    i32.const 3
    i32.add
    local.get $6
    local.get $1
    i32.load8_u offset=53
    select
    local.set $6
    local.get $1
    i32.load8_u offset=27
    if
     local.get $1
     i32.const 0
     i32.store8 offset=27
     br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1450
    end
    local.get $1
    local.get $1
    i32.load offset=12
    local.get $6
    i32.sub
    i32.store offset=12
   end
   block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1451
    local.get $3
    i32.const 0
    i32.le_s
    br_if $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1451
    local.get $3
    i32.const 3
    i32.add
    local.get $3
    local.get $4
    i32.load8_u offset=56
    select
    local.tee $3
    i32.const 3
    i32.add
    local.get $3
    local.get $4
    i32.load8_u offset=53
    select
    local.set $3
    local.get $4
    i32.load8_u offset=27
    if
     local.get $4
     i32.const 0
     i32.store8 offset=27
     br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1451
    end
    local.get $4
    local.get $4
    i32.load offset=12
    local.get $3
    i32.sub
    i32.store offset=12
   end
   local.get $4
   i32.load8_u offset=36
   if (result i32)
    local.get $1
    i32.load offset=12
    i32.const 0
    i32.gt_s
   else
    i32.const 0
   end
   if
    local.get $1
    i32.const 0
    i32.store offset=12
   end
   local.get $1
   if (result i32)
    local.get $1
    i32.load8_u offset=36
   else
    i32.const 0
   end
   if (result i32)
    local.get $4
    i32.load offset=12
    i32.const 0
    i32.gt_s
   else
    i32.const 0
   end
   if
    local.get $4
    i32.const 0
    i32.store offset=12
   end
  end
  local.get $4
  i32.load8_u offset=35
  if
   local.get $5
   local.get $2
   local.get $5
   i32.load offset=44
   i32.add
   i32.store offset=44
   local.get $5
   local.get $2
   local.get $5
   i32.load offset=40
   i32.add
   i32.store offset=40
   local.get $5
   i32.load offset=48
   local.tee $1
   local.get $5
   i32.load offset=44
   i32.lt_s
   if
    local.get $5
    local.get $1
    i32.store offset=44
    local.get $5
    local.get $5
    i32.load offset=48
    i32.store offset=40
   end
  end
  local.get $4
  local.get $4
  i32.load offset=40
  i32.const 1
  i32.add
  i32.store offset=40
  local.get $4
  i32.const 1
  i32.store8 offset=26
  block $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1452 (result i32)
   i32.const 4
   local.get $4
   i32.load8_u offset=34
   br_if $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1452
   drop
   i32.const 2
   local.get $4
   i32.load8_u offset=33
   br_if $__inlined_func$assembly/engine/combatProcessor/getMaxAttacks$1452
   drop
   i32.const 1
  end
  local.get $4
  i32.load offset=40
  i32.le_s
  if
   local.get $4
   i32.const 0
   i32.store8 offset=24
  end
  local.get $4
  i32.load8_u offset=29
  if
   local.get $4
   i32.const 0
   i32.store8 offset=29
  end
  local.get $0
  call $assembly/engine/combatProcessor/removeDeadMinions
  local.get $0
  i32.load
  i32.load offset=44
  i32.const 0
  i32.le_s
  if (result i32)
   local.get $0
   i32.load offset=4
   i32.load offset=44
   i32.const 0
   i32.le_s
  else
   i32.const 0
  end
  if
   local.get $0
   i32.const 3
   i32.store offset=16
   local.get $0
   i32.const 1
   i32.store offset=20
  else
   local.get $0
   i32.load
   i32.load offset=44
   i32.const 0
   i32.le_s
   if
    local.get $0
    i32.const 3
    i32.store offset=16
    local.get $0
    i32.const 1
    i32.store offset=20
   else
    local.get $0
    i32.load offset=4
    i32.load offset=44
    i32.const 0
    i32.le_s
    if
     local.get $0
     i32.const 3
     i32.store offset=16
     local.get $0
     i32.const 0
     i32.store offset=20
    end
   end
  end
  i32.const 1
 )
 (func $assembly/engine/turnManager/endTurn (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  local.get $0
  i32.load offset=16
  i32.const 3
  i32.eq
  if
   i32.const 0
   return
  end
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load offset=4
  else
   local.get $0
   i32.load
  end
  local.set $5
  local.get $0
  i32.load offset=8
  if (result i32)
   local.get $0
   i32.load
  else
   local.get $0
   i32.load offset=4
  end
  local.set $2
  loop $for-loop|0
   local.get $3
   local.get $5
   i32.load offset=12
   local.tee $6
   i32.load offset=12
   i32.lt_s
   if
    local.get $6
    local.get $3
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    local.tee $6
    i32.load8_u offset=28
    if (result i32)
     local.get $6
     i32.load8_u offset=26
    else
     i32.const 1
    end
    i32.eqz
    if
     local.get $6
     i32.const 0
     i32.store8 offset=28
    end
    local.get $6
    i32.load8_u offset=52
    if
     block $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1454
      i32.const 6
      i32.const 3
      local.get $6
      i32.load8_u offset=56
      select
      local.tee $7
      i32.const 3
      i32.add
      local.get $7
      local.get $6
      i32.load8_u offset=53
      select
      local.set $7
      local.get $6
      i32.load8_u offset=27
      if
       local.get $6
       i32.const 0
       i32.store8 offset=27
       br $__inlined_func$assembly/engine/combatProcessor/dealDamageToMinion$1454
      end
      local.get $6
      local.get $6
      i32.load offset=12
      local.get $7
      i32.sub
      i32.store offset=12
     end
    end
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|0
   end
  end
  local.get $5
  i32.load offset=28
  if (result i32)
   local.get $5
   i32.load offset=68
   i32.const 0
   i32.gt_s
  else
   i32.const 0
  end
  if
   local.get $5
   i32.load offset=28
   local.tee $3
   local.get $3
   i32.load offset=20
   local.get $5
   i32.load offset=68
   i32.sub
   i32.store offset=20
   local.get $5
   i32.load offset=28
   i32.load offset=20
   i32.const 0
   i32.le_s
   if
    local.get $5
    i32.load offset=20
    local.get $5
    i32.load offset=28
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $5
    i32.const 0
    i32.store offset=28
   end
  end
  local.get $0
  call $assembly/engine/combatProcessor/removeDeadMinions
  local.get $5
  i32.load offset=36
  local.tee $3
  i32.load offset=12
  local.tee $6
  i32.const 0
  i32.gt_s
  if
   local.get $3
   local.get $6
   i32.store offset=8
   local.get $5
   i32.load offset=36
   i32.const 0
   i32.store offset=12
  end
  local.get $0
  local.get $0
  i32.load offset=8
  i32.eqz
  i32.store offset=8
  local.get $0
  i32.load offset=8
  i32.eqz
  if
   local.get $0
   local.get $0
   i32.load offset=12
   i32.const 1
   i32.add
   i32.store offset=12
  end
  local.get $2
  i32.load offset=36
  local.tee $3
  i32.load offset=4
  local.tee $5
  i32.const 10
  i32.lt_s
  if
   local.get $3
   local.get $5
   i32.const 1
   i32.add
   i32.store offset=4
  end
  local.get $2
  i32.load offset=36
  local.tee $3
  local.get $3
  i32.load offset=4
  local.get $3
  i32.load offset=8
  i32.sub
  i32.store
  local.get $2
  i32.load offset=36
  i32.load
  i32.const 0
  i32.lt_s
  if
   local.get $2
   i32.load offset=36
   i32.const 0
   i32.store
  end
  local.get $2
  i32.load offset=36
  i32.const 0
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store offset=64
  local.get $2
  i32.const 0
  i32.store offset=68
  local.get $2
  i32.load offset=60
  i32.const 0
  i32.store8 offset=8
  loop $for-loop|00
   local.get $4
   local.get $2
   i32.load offset=12
   local.tee $3
   i32.load offset=12
   i32.lt_s
   if
    local.get $3
    local.get $4
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    local.tee $3
    i32.const 0
    i32.store offset=40
    local.get $3
    i32.const 0
    i32.store8 offset=26
    local.get $3
    i32.const 1
    i32.store8 offset=24
    local.get $3
    i32.load8_u offset=25
    if (result i32)
     local.get $3
     i32.load8_u offset=32
    else
     i32.const 1
    end
    if (result i32)
     i32.const 1
    else
     local.get $3
     i32.load8_u offset=31
    end
    i32.eqz
    if
     local.get $3
     i32.const 0
     i32.store8 offset=25
    end
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|00
   end
  end
  loop $for-loop|001
   local.get $1
   local.get $2
   i32.load offset=12
   local.tee $3
   i32.load offset=12
   i32.lt_s
   if
    local.get $3
    local.get $1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    drop
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|001
   end
  end
  local.get $0
  local.get $2
  call $assembly/engine/drawEngine/drawCardForPlayer
  local.get $0
  call $assembly/engine/combatProcessor/removeDeadMinions
  local.get $0
  i32.load
  i32.load offset=44
  i32.const 0
  i32.le_s
  if (result i32)
   local.get $0
   i32.load offset=4
   i32.load offset=44
   i32.const 0
   i32.le_s
  else
   i32.const 0
  end
  if
   local.get $0
   i32.const 3
   i32.store offset=16
   local.get $0
   i32.const 1
   i32.store offset=20
  else
   local.get $0
   i32.load
   i32.load offset=44
   i32.const 0
   i32.le_s
   if
    local.get $0
    i32.const 3
    i32.store offset=16
    local.get $0
    i32.const 1
    i32.store offset=20
   else
    local.get $0
    i32.load offset=4
    i32.load offset=44
    i32.const 0
    i32.le_s
    if
     local.get $0
     i32.const 3
     i32.store offset=16
     local.get $0
     i32.const 0
     i32.store offset=20
    end
   end
  end
  i32.const 1
 )
 (func $assembly/index/applyGameAction (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  i32.const 16
  i32.const 19
  call $~lib/rt/stub/__new
  local.tee $3
  i32.const 0
  i32.store
  local.get $3
  i32.const 0
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store8 offset=8
  local.get $3
  i32.const 0
  i32.store offset=12
  local.get $3
  local.get $0
  i32.store
  local.get $3
  i32.const 2160
  i32.store offset=4
  local.get $3
  i32.const 1
  i32.store8 offset=8
  local.get $3
  i32.const 2160
  i32.store offset=12
  block $__inlined_func$assembly/engine/actionProcessor/applyAction$23
   local.get $0
   i32.load offset=16
   i32.const 3
   i32.eq
   if
    local.get $3
    i32.const 0
    i32.store8 offset=8
    local.get $3
    i32.const 8336
    i32.store offset=12
    br $__inlined_func$assembly/engine/actionProcessor/applyAction$23
   end
   local.get $1
   i32.load
   local.tee $4
   if
    local.get $4
    i32.const 1
    i32.eq
    if
     local.get $0
     local.get $1
     i32.load offset=12
     local.get $1
     i32.load offset=16
     call $assembly/engine/combatProcessor/processAttack
     local.set $2
    else
     local.get $1
     i32.load
     i32.const 2
     i32.eq
     if
      local.get $0
      call $assembly/engine/turnManager/endTurn
      local.set $2
     else
      local.get $1
      i32.load
      i32.const 3
      i32.eq
      if
       block $__inlined_func$assembly/engine/actionProcessor/useHeroPower$1601 (result i32)
        local.get $1
        i32.load offset=8
        drop
        local.get $0
        i32.load offset=8
        if (result i32)
         local.get $0
         i32.load offset=4
        else
         local.get $0
         i32.load
        end
        local.set $2
        local.get $0
        i32.load offset=8
        if (result i32)
         local.get $0
         i32.load
        else
         local.get $0
         i32.load offset=4
        end
        drop
        i32.const 0
        local.get $2
        i32.load offset=60
        local.tee $4
        i32.load8_u offset=8
        br_if $__inlined_func$assembly/engine/actionProcessor/useHeroPower$1601
        drop
        i32.const 0
        local.get $2
        i32.load offset=36
        local.tee $1
        i32.load
        local.tee $5
        local.get $4
        i32.load offset=4
        local.tee $4
        i32.lt_s
        br_if $__inlined_func$assembly/engine/actionProcessor/useHeroPower$1601
        drop
        local.get $1
        local.get $5
        local.get $4
        i32.sub
        i32.store
        local.get $2
        i32.load offset=60
        i32.const 1
        i32.store8 offset=8
        i32.const 1
       end
       local.set $2
      else
       local.get $1
       i32.load
       i32.const 4
       i32.eq
       if
        local.get $0
        local.get $0
        i32.load offset=8
        if (result i32)
         local.get $0
         i32.load offset=4
        else
         local.get $0
         i32.load
        end
        call $assembly/engine/drawEngine/drawCardForPlayer
        i32.const 1
        local.set $2
       else
        local.get $3
        i32.const 10432
        i32.store offset=12
       end
      end
     end
    end
   else
    local.get $0
    local.get $1
    i32.load offset=4
    local.get $1
    i32.load offset=8
    call $assembly/engine/cardPlayer/playCard
    local.set $2
   end
   local.get $3
   local.get $2
   i32.store8 offset=8
   local.get $2
   if (result i32)
    i32.const 0
   else
    local.get $3
    i32.load offset=12
    i32.const 2160
    call $~lib/string/String.__eq
   end
   if
    local.get $3
    i32.const 10496
    i32.store offset=12
   end
  end
  local.get $3
  local.get $0
  call $assembly/engine/stateSerializer/serializeGameState
  call $assembly/util/sha256/sha256
  i32.store offset=4
  local.get $3
 )
 (func $assembly/util/cardLookup/beginCard (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  i32.const 72
  i32.const 4
  call $~lib/rt/stub/__new
  local.tee $4
  i32.const 0
  i32.store
  local.get $4
  i32.const 0
  i32.store offset=4
  local.get $4
  i32.const 0
  i32.store offset=8
  local.get $4
  i32.const 0
  i32.store offset=12
  local.get $4
  i32.const 0
  i32.store offset=16
  local.get $4
  i32.const 0
  i32.store offset=20
  local.get $4
  i32.const 0
  i32.store offset=24
  local.get $4
  i32.const 0
  i32.store offset=28
  local.get $4
  i32.const 0
  i32.store offset=32
  local.get $4
  i32.const 0
  i32.store offset=36
  local.get $4
  i32.const 0
  i32.store offset=40
  local.get $4
  i32.const 0
  i32.store offset=44
  local.get $4
  i32.const 0
  i32.store offset=48
  local.get $4
  i32.const 0
  i32.store offset=52
  local.get $4
  i32.const 0
  i32.store offset=56
  local.get $4
  i32.const 0
  i32.store offset=60
  local.get $4
  i32.const 0
  i32.store offset=64
  local.get $4
  i32.const 0
  i32.store offset=68
  local.get $4
  i32.const 0
  i32.store
  local.get $4
  i32.const 2160
  i32.store offset=4
  local.get $4
  i32.const 0
  i32.store offset=8
  local.get $4
  i32.const 0
  i32.store offset=12
  local.get $4
  i32.const 0
  i32.store offset=16
  local.get $4
  i32.const 0
  i32.store offset=20
  local.get $4
  i32.const 11
  i32.store offset=24
  local.get $4
  i32.const 10576
  i32.store offset=28
  local.get $4
  i32.const 2160
  i32.store offset=32
  local.get $4
  i32.const 0
  i32.const 2
  i32.const 5
  i32.const 10608
  call $~lib/rt/__newArray
  i32.store offset=36
  local.get $4
  i32.const 0
  i32.store offset=40
  local.get $4
  i32.const 0
  i32.store offset=44
  local.get $4
  i32.const 0
  i32.store offset=48
  local.get $4
  i32.const 0
  i32.store offset=52
  local.get $4
  i32.const 0
  i32.store offset=56
  local.get $4
  i32.const 0
  i32.store offset=60
  local.get $4
  i32.const 2160
  i32.store offset=64
  local.get $4
  i32.const 2160
  i32.store offset=68
  local.get $4
  local.get $0
  i32.store
  local.get $4
  local.get $1
  i32.store offset=4
  local.get $4
  local.get $2
  i32.store offset=8
  local.get $4
  local.get $3
  i32.store offset=12
  local.get $4
  global.set $assembly/util/cardLookup/pendingCard
 )
 (func $assembly/util/cardLookup/setCardStats (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   global.get $assembly/util/cardLookup/pendingCard
   local.get $0
   i32.store offset=16
   global.get $assembly/util/cardLookup/pendingCard
   local.get $1
   i32.store offset=20
   global.get $assembly/util/cardLookup/pendingCard
   local.get $2
   i32.store offset=24
   global.get $assembly/util/cardLookup/pendingCard
   local.get $3
   i32.store offset=56
   global.get $assembly/util/cardLookup/pendingCard
   local.get $4
   i32.store offset=60
  end
 )
 (func $assembly/util/cardLookup/setCardMeta (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   global.get $assembly/util/cardLookup/pendingCard
   local.get $0
   i32.store offset=28
   global.get $assembly/util/cardLookup/pendingCard
   local.get $1
   i32.store offset=32
   global.get $assembly/util/cardLookup/pendingCard
   local.get $2
   i32.store offset=64
   global.get $assembly/util/cardLookup/pendingCard
   local.get $3
   i32.store offset=68
  end
 )
 (func $assembly/util/cardLookup/addCardKeyword (param $0 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   global.get $assembly/util/cardLookup/pendingCard
   i32.load offset=36
   local.get $0
   call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
  end
 )
 (func $assembly/util/cardLookup/setCardBattlecry (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32)
  (local $7 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   call $assembly/types/GameState/EffectDef#constructor
   local.tee $7
   local.get $0
   i32.store
   local.get $7
   local.get $1
   i32.store offset=4
   local.get $7
   local.get $2
   i32.store offset=8
   local.get $7
   local.get $3
   i32.store offset=12
   local.get $7
   local.get $4
   i32.store offset=16
   local.get $7
   local.get $5
   i32.store offset=24
   local.get $7
   local.get $6
   i32.store offset=28
   global.get $assembly/util/cardLookup/pendingCard
   local.get $7
   i32.store offset=40
  end
 )
 (func $assembly/util/cardLookup/setCardDeathrattle (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32)
  (local $7 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   call $assembly/types/GameState/EffectDef#constructor
   local.tee $7
   local.get $0
   i32.store
   local.get $7
   local.get $1
   i32.store offset=4
   local.get $7
   local.get $2
   i32.store offset=8
   local.get $7
   local.get $3
   i32.store offset=12
   local.get $7
   local.get $4
   i32.store offset=16
   local.get $7
   local.get $5
   i32.store offset=24
   local.get $7
   local.get $6
   i32.store offset=28
   global.get $assembly/util/cardLookup/pendingCard
   local.get $7
   i32.store offset=44
  end
 )
 (func $assembly/util/cardLookup/setCardSpellEffect (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32)
  (local $7 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   call $assembly/types/GameState/EffectDef#constructor
   local.tee $7
   local.get $0
   i32.store
   local.get $7
   local.get $1
   i32.store offset=4
   local.get $7
   local.get $2
   i32.store offset=8
   local.get $7
   local.get $3
   i32.store offset=12
   local.get $7
   local.get $4
   i32.store offset=16
   local.get $7
   local.get $5
   i32.store offset=24
   local.get $7
   local.get $6
   i32.store offset=28
   global.get $assembly/util/cardLookup/pendingCard
   local.get $7
   i32.store offset=48
  end
 )
 (func $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#set" (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  local.get $0
  i32.load
  local.get $1
  local.tee $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $8
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1508"
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $3
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1508"
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if
   local.get $1
   local.get $2
   i32.store offset=4
  else
   local.get $0
   i32.load offset=12
   local.tee $1
   local.get $0
   i32.load offset=16
   i32.eq
   if
    local.get $0
    i32.load offset=20
    local.get $1
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load offset=4
    else
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $6
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $7
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $9
    i32.const 12
    i32.mul
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $4
    local.get $0
    i32.load offset=8
    local.tee $5
    local.get $0
    i32.load offset=16
    i32.const 12
    i32.mul
    i32.add
    local.set $10
    local.get $4
    local.set $1
    loop $while-continue|00
     local.get $5
     local.get $10
     i32.ne
     if
      local.get $5
      i32.load offset=8
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $5
       i32.load
       local.tee $11
       i32.store
       local.get $1
       local.get $5
       i32.load offset=4
       i32.store offset=4
       local.get $1
       local.get $7
       local.get $11
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $11
       i32.const 15
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $11
       i32.const 13
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $11
       i32.const 16
       i32.shr_u
       local.get $11
       i32.xor
       local.get $6
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $11
       i32.load
       i32.store offset=8
       local.get $11
       local.get $1
       i32.store
       local.get $1
       i32.const 12
       i32.add
       local.set $1
      end
      local.get $5
      i32.const 12
      i32.add
      local.set $5
      br $while-continue|00
     end
    end
    local.get $0
    local.get $7
    i32.store
    local.get $0
    local.get $6
    i32.store offset=4
    local.get $0
    local.get $4
    i32.store offset=8
    local.get $0
    local.get $9
    i32.store offset=12
    local.get $0
    local.get $0
    i32.load offset=20
    i32.store offset=16
   end
   local.get $0
   i32.load offset=8
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $4
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $4
   i32.const 12
   i32.mul
   i32.add
   local.tee $1
   local.get $3
   i32.store
   local.get $1
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   local.get $1
   local.get $0
   i32.load
   local.get $8
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $1
   i32.store
  end
 )
 (func $assembly/util/cardLookup/commitCard
  (local $0 i32)
  global.get $assembly/util/cardLookup/pendingCard
  if
   global.get $assembly/util/cardLookup/cardRegistry
   global.get $assembly/util/cardLookup/pendingCard
   local.tee $0
   i32.load
   local.get $0
   call $"~lib/map/Map<i32,assembly/types/GameState/CardDef>#set"
   i32.const 0
   global.set $assembly/util/cardLookup/pendingCard
  end
 )
 (func $assembly/util/cardLookup/getCardCount (result i32)
  global.get $assembly/util/cardLookup/cardRegistry
  i32.load offset=20
 )
 (func $assembly/util/cardLookup/clearCardData
  (local $0 i32)
  global.get $assembly/util/cardLookup/cardRegistry
  local.tee $0
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $0
  i32.const 3
  i32.store offset=4
  local.get $0
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $0
  i32.const 4
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
 )
 (func $~lib/array/Array<assembly/types/PokerTypes/PokerCard>#slice@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   i32.const 2147483647
   local.set $1
  end
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 0
  local.get $2
  i32.const 0
  i32.le_s
  select
  local.set $3
  local.get $1
  local.get $2
  local.get $1
  local.get $2
  i32.lt_s
  select
  local.get $3
  i32.sub
  local.tee $1
  i32.const 0
  local.get $1
  i32.const 0
  i32.gt_s
  select
  local.tee $2
  i32.const 2
  i32.const 23
  i32.const 0
  call $~lib/rt/__newArray
  local.tee $1
  i32.load offset=4
  local.set $4
  local.get $0
  i32.load offset=4
  local.get $3
  i32.const 2
  i32.shl
  i32.add
  local.set $3
  i32.const 0
  local.set $0
  local.get $2
  i32.const 2
  i32.shl
  local.set $2
  loop $while-continue|0
   local.get $0
   local.get $2
   i32.lt_u
   if
    local.get $0
    local.get $4
    i32.add
    local.get $0
    local.get $3
    i32.add
    i32.load
    i32.store
    local.get $0
    i32.const 4
    i32.add
    local.set $0
    br $while-continue|0
   end
  end
  local.get $1
 )
 (func $assembly/poker/handEvaluator/sortByValueDesc (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  call $~lib/array/Array<assembly/types/PokerTypes/PokerCard>#slice@varargs
  local.set $3
  loop $for-loop|0
   local.get $1
   local.get $3
   i32.load offset=12
   i32.lt_s
   if
    local.get $1
    i32.const 1
    i32.add
    local.set $0
    loop $for-loop|1
     local.get $0
     local.get $3
     i32.load offset=12
     i32.lt_s
     if
      local.get $3
      local.get $0
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load offset=4
      local.get $3
      local.get $1
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load offset=4
      i32.gt_s
      if
       local.get $3
       local.get $1
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $2
       local.get $3
       local.get $1
       local.get $3
       local.get $0
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       call $~lib/array/Array<u32>#__set
       local.get $3
       local.get $0
       local.get $2
       call $~lib/array/Array<u32>#__set
      end
      local.get $0
      i32.const 1
      i32.add
      local.set $0
      br $for-loop|1
     end
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  local.get $3
 )
 (func $"~lib/map/Map<i32,i32>#constructor" (result i32)
  (local $0 i32)
  i32.const 24
  i32.const 25
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $0
  i32.const 3
  i32.store offset=4
  local.get $0
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $0
  i32.const 4
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
  local.get $0
 )
 (func $"~lib/map/Map<i32,i32>#get" (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.load
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  i32.const 15
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  i32.const 13
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  i32.const 16
  i32.shr_u
  local.get $0
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $0
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1518"
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load
      local.get $1
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1518"
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   i32.const 8384
   i32.const 8448
   i32.const 105
   i32.const 17
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
 )
 (func $"~lib/map/Map<i32,i32>#set" (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  local.get $0
  i32.load
  local.get $1
  local.tee $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $8
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1521"
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $3
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1521"
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if
   local.get $1
   local.get $2
   i32.store offset=4
  else
   local.get $0
   i32.load offset=12
   local.tee $1
   local.get $0
   i32.load offset=16
   i32.eq
   if
    local.get $0
    i32.load offset=20
    local.get $1
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load offset=4
    else
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $6
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $7
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $9
    i32.const 12
    i32.mul
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $4
    local.get $0
    i32.load offset=8
    local.tee $5
    local.get $0
    i32.load offset=16
    i32.const 12
    i32.mul
    i32.add
    local.set $10
    local.get $4
    local.set $1
    loop $while-continue|00
     local.get $5
     local.get $10
     i32.ne
     if
      local.get $5
      i32.load offset=8
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $5
       i32.load
       local.tee $11
       i32.store
       local.get $1
       local.get $5
       i32.load offset=4
       i32.store offset=4
       local.get $1
       local.get $7
       local.get $11
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $11
       i32.const 15
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $11
       i32.const 13
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $11
       i32.const 16
       i32.shr_u
       local.get $11
       i32.xor
       local.get $6
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $11
       i32.load
       i32.store offset=8
       local.get $11
       local.get $1
       i32.store
       local.get $1
       i32.const 12
       i32.add
       local.set $1
      end
      local.get $5
      i32.const 12
      i32.add
      local.set $5
      br $while-continue|00
     end
    end
    local.get $0
    local.get $7
    i32.store
    local.get $0
    local.get $6
    i32.store offset=4
    local.get $0
    local.get $4
    i32.store offset=8
    local.get $0
    local.get $9
    i32.store offset=12
    local.get $0
    local.get $0
    i32.load offset=20
    i32.store offset=16
   end
   local.get $0
   i32.load offset=8
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $4
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $4
   i32.const 12
   i32.mul
   i32.add
   local.tee $1
   local.get $3
   i32.store
   local.get $1
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   local.get $1
   local.get $0
   i32.load
   local.get $8
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $1
   i32.store
  end
 )
 (func $~lib/array/Array<i32>#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 16
  i32.const 8
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 268435455
  i32.gt_u
  if
   i32.const 1184
   i32.const 2224
   i32.const 70
   i32.const 60
   call $~lib/builtins/abort
   unreachable
  end
  i32.const 8
  local.get $0
  local.get $0
  i32.const 8
  i32.le_u
  select
  i32.const 2
  i32.shl
  local.tee $2
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $3
  i32.const 0
  local.get $2
  memory.fill
  local.get $1
  local.get $3
  i32.store
  local.get $1
  local.get $3
  i32.store offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=12
  local.get $1
 )
 (func $assembly/poker/handEvaluator/evaluateFiveCardHand~anonymous|0 (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.sub
 )
 (func $~lib/util/sort/insertionSort<i32> (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  local.get $1
  local.get $3
  local.get $2
  local.get $1
  i32.sub
  i32.const 1
  i32.add
  local.tee $5
  local.get $3
  i32.sub
  i32.const 1
  i32.and
  i32.sub
  local.get $5
  i32.const 1
  i32.and
  local.get $3
  select
  i32.add
  local.set $7
  loop $for-loop|0
   local.get $2
   local.get $7
   i32.ge_s
   if
    local.get $0
    local.get $7
    i32.const 2
    i32.shl
    i32.add
    local.tee $3
    i32.load offset=4
    local.tee $6
    local.set $5
    local.get $3
    i32.load
    local.set $3
    i32.const 2
    global.set $~argumentsLength
    local.get $3
    local.get $6
    local.get $4
    i32.load
    call_indirect (type $0)
    i32.const 0
    i32.le_s
    if
     local.get $3
     local.set $5
     local.get $6
     local.set $3
    end
    local.get $7
    i32.const 1
    i32.sub
    local.set $6
    loop $while-continue|1
     local.get $1
     local.get $6
     i32.le_s
     if
      block $while-break|1
       local.get $0
       local.get $6
       i32.const 2
       i32.shl
       i32.add
       local.tee $8
       i32.load
       local.set $9
       i32.const 2
       global.set $~argumentsLength
       local.get $9
       local.get $3
       local.get $4
       i32.load
       call_indirect (type $0)
       i32.const 0
       i32.le_s
       br_if $while-break|1
       local.get $8
       local.get $9
       i32.store offset=8
       local.get $6
       i32.const 1
       i32.sub
       local.set $6
       br $while-continue|1
      end
     end
    end
    local.get $0
    local.get $6
    i32.const 2
    i32.shl
    i32.add
    local.get $3
    i32.store offset=8
    loop $while-continue|2
     local.get $1
     local.get $6
     i32.le_s
     if
      block $while-break|2
       local.get $0
       local.get $6
       i32.const 2
       i32.shl
       i32.add
       local.tee $3
       i32.load
       local.set $8
       i32.const 2
       global.set $~argumentsLength
       local.get $8
       local.get $5
       local.get $4
       i32.load
       call_indirect (type $0)
       i32.const 0
       i32.le_s
       br_if $while-break|2
       local.get $3
       local.get $8
       i32.store offset=4
       local.get $6
       i32.const 1
       i32.sub
       local.set $6
       br $while-continue|2
      end
     end
    end
    local.get $0
    local.get $6
    i32.const 2
    i32.shl
    i32.add
    local.get $5
    i32.store offset=4
    local.get $7
    i32.const 2
    i32.add
    local.set $7
    br $for-loop|0
   end
  end
 )
 (func $~lib/util/sort/extendRunRight<i32> (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  local.get $2
  i32.eq
  if
   local.get $1
   return
  end
  local.get $0
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.get $0
  local.get $1
  i32.const 1
  i32.add
  local.tee $4
  i32.const 2
  i32.shl
  i32.add
  i32.load
  i32.const 2
  global.set $~argumentsLength
  local.get $3
  i32.load
  call_indirect (type $0)
  i32.const 0
  i32.gt_s
  if
   loop $while-continue|0
    local.get $2
    local.get $4
    i32.gt_s
    if (result i32)
     local.get $0
     local.get $4
     i32.const 2
     i32.shl
     i32.add
     local.tee $5
     i32.load offset=4
     local.get $5
     i32.load
     i32.const 2
     global.set $~argumentsLength
     local.get $3
     i32.load
     call_indirect (type $0)
     i32.const 31
     i32.shr_u
    else
     i32.const 0
    end
    if
     local.get $4
     i32.const 1
     i32.add
     local.set $4
     br $while-continue|0
    end
   end
   local.get $4
   local.set $2
   loop $while-continue|1
    local.get $1
    local.get $2
    i32.lt_s
    if
     local.get $0
     local.get $1
     i32.const 2
     i32.shl
     i32.add
     local.tee $3
     i32.load
     local.set $5
     local.get $3
     local.get $0
     local.get $2
     i32.const 2
     i32.shl
     i32.add
     local.tee $3
     i32.load
     i32.store
     local.get $1
     i32.const 1
     i32.add
     local.set $1
     local.get $3
     local.get $5
     i32.store
     local.get $2
     i32.const 1
     i32.sub
     local.set $2
     br $while-continue|1
    end
   end
  else
   loop $while-continue|2
    local.get $2
    local.get $4
    i32.gt_s
    if (result i32)
     local.get $0
     local.get $4
     i32.const 2
     i32.shl
     i32.add
     local.tee $1
     i32.load offset=4
     local.get $1
     i32.load
     i32.const 2
     global.set $~argumentsLength
     local.get $3
     i32.load
     call_indirect (type $0)
     i32.const 0
     i32.ge_s
    else
     i32.const 0
    end
    if
     local.get $4
     i32.const 1
     i32.add
     local.set $4
     br $while-continue|2
    end
   end
  end
  local.get $4
 )
 (func $~lib/util/sort/mergeRuns<i32> (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  local.get $2
  i32.const 1
  i32.sub
  local.tee $6
  local.get $3
  i32.add
  local.set $7
  local.get $6
  i32.const 1
  i32.add
  local.set $2
  loop $for-loop|0
   local.get $1
   local.get $2
   i32.lt_s
   if
    local.get $2
    i32.const 1
    i32.sub
    local.tee $2
    i32.const 2
    i32.shl
    local.tee $8
    local.get $4
    i32.add
    local.get $0
    local.get $8
    i32.add
    i32.load
    i32.store
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $6
   i32.gt_s
   if
    local.get $4
    local.get $7
    local.get $6
    i32.sub
    i32.const 2
    i32.shl
    i32.add
    local.get $0
    local.get $6
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=4
    i32.store
    local.get $6
    i32.const 1
    i32.add
    local.set $6
    br $for-loop|1
   end
  end
  loop $for-loop|2
   local.get $1
   local.get $3
   i32.le_s
   if
    local.get $4
    local.get $6
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.set $7
    local.get $4
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.set $8
    i32.const 2
    global.set $~argumentsLength
    local.get $7
    local.get $8
    local.get $5
    i32.load
    call_indirect (type $0)
    i32.const 0
    i32.lt_s
    if
     local.get $0
     local.get $1
     i32.const 2
     i32.shl
     i32.add
     local.get $7
     i32.store
     local.get $6
     i32.const 1
     i32.sub
     local.set $6
    else
     local.get $0
     local.get $1
     i32.const 2
     i32.shl
     i32.add
     local.get $8
     i32.store
     local.get $2
     i32.const 1
     i32.add
     local.set $2
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|2
   end
  end
 )
 (func $~lib/util/sort/SORT<i32> (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i64)
  (local $14 i32)
  (local $15 i32)
  local.get $1
  i32.const 48
  i32.le_s
  if
   local.get $1
   i32.const 1
   i32.le_s
   if
    return
   end
   block $break|0
    block $case1|0
     local.get $1
     i32.const 3
     i32.ne
     if
      local.get $1
      i32.const 2
      i32.eq
      br_if $case1|0
      br $break|0
     end
     local.get $0
     i32.load
     local.set $1
     local.get $0
     i32.load offset=4
     local.set $3
     i32.const 2
     global.set $~argumentsLength
     local.get $0
     local.get $3
     local.get $1
     local.get $1
     local.get $3
     local.get $2
     i32.load
     call_indirect (type $0)
     i32.const 0
     i32.gt_s
     local.tee $4
     select
     i32.store
     local.get $0
     i32.load offset=8
     local.set $5
     i32.const 2
     global.set $~argumentsLength
     local.get $1
     local.get $3
     local.get $4
     select
     local.tee $1
     local.get $5
     local.get $2
     i32.load
     call_indirect (type $0)
     i32.const 0
     i32.gt_s
     local.set $3
     local.get $0
     local.get $5
     local.get $1
     local.get $3
     select
     i32.store offset=4
     local.get $0
     local.get $1
     local.get $5
     local.get $3
     select
     i32.store offset=8
    end
    local.get $0
    i32.load
    local.set $1
    local.get $0
    i32.load offset=4
    local.set $3
    i32.const 2
    global.set $~argumentsLength
    local.get $0
    local.get $3
    local.get $1
    local.get $1
    local.get $3
    local.get $2
    i32.load
    call_indirect (type $0)
    i32.const 0
    i32.gt_s
    local.tee $2
    select
    i32.store
    local.get $0
    local.get $1
    local.get $3
    local.get $2
    select
    i32.store offset=4
    return
   end
   local.get $0
   i32.const 0
   local.get $1
   i32.const 1
   i32.sub
   i32.const 0
   local.get $2
   call $~lib/util/sort/insertionSort<i32>
   return
  end
  i32.const 33
  local.get $1
  i32.clz
  i32.sub
  local.tee $6
  i32.const 2
  i32.shl
  local.tee $7
  i32.const 1
  i32.shl
  call $~lib/rt/stub/__alloc
  local.tee $10
  local.get $7
  i32.add
  local.set $12
  loop $for-loop|1
   local.get $5
   local.get $6
   i32.lt_u
   if
    local.get $10
    local.get $5
    i32.const 2
    i32.shl
    i32.add
    i32.const -1
    i32.store
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
  local.get $1
  i32.const 2
  i32.shl
  call $~lib/rt/stub/__alloc
  local.set $11
  local.get $0
  i32.const 0
  local.get $1
  i32.const 1
  i32.sub
  local.tee $9
  local.get $2
  call $~lib/util/sort/extendRunRight<i32>
  local.tee $5
  i32.const 1
  i32.add
  local.tee $1
  i32.const 32
  i32.lt_s
  if
   local.get $0
   i32.const 0
   i32.const 31
   local.get $9
   local.get $9
   i32.const 31
   i32.ge_s
   select
   local.tee $5
   local.get $1
   local.get $2
   call $~lib/util/sort/insertionSort<i32>
  end
  loop $while-continue|2
   local.get $5
   local.get $9
   i32.lt_s
   if
    local.get $0
    local.get $5
    i32.const 1
    i32.add
    local.tee $6
    local.get $9
    local.get $2
    call $~lib/util/sort/extendRunRight<i32>
    local.tee $1
    local.get $6
    i32.sub
    i32.const 1
    i32.add
    local.tee $7
    i32.const 32
    i32.lt_s
    if
     local.get $0
     local.get $6
     local.get $9
     local.get $6
     i32.const 31
     i32.add
     local.tee $1
     local.get $1
     local.get $9
     i32.gt_s
     select
     local.tee $1
     local.get $7
     local.get $2
     call $~lib/util/sort/insertionSort<i32>
    end
    local.get $3
    local.get $6
    i32.add
    i64.extend_i32_u
    i64.const 30
    i64.shl
    local.get $9
    i32.const 1
    i32.add
    i64.extend_i32_u
    local.tee $13
    i64.div_u
    local.get $1
    local.get $6
    i32.add
    i32.const 1
    i32.add
    i64.extend_i32_u
    i64.const 30
    i64.shl
    local.get $13
    i64.div_u
    i64.xor
    i32.wrap_i64
    i32.clz
    local.set $7
    loop $for-loop|3
     local.get $4
     local.get $7
     i32.gt_u
     if
      local.get $4
      i32.const 2
      i32.shl
      local.tee $14
      local.get $10
      i32.add
      local.tee $15
      i32.load
      local.tee $8
      i32.const -1
      i32.ne
      if
       local.get $0
       local.get $8
       local.get $12
       local.get $14
       i32.add
       i32.load
       i32.const 1
       i32.add
       local.get $5
       local.get $11
       local.get $2
       call $~lib/util/sort/mergeRuns<i32>
       local.get $15
       i32.const -1
       i32.store
       local.get $8
       local.set $3
      end
      local.get $4
      i32.const 1
      i32.sub
      local.set $4
      br $for-loop|3
     end
    end
    local.get $7
    i32.const 2
    i32.shl
    local.tee $4
    local.get $10
    i32.add
    local.get $3
    i32.store
    local.get $4
    local.get $12
    i32.add
    local.get $5
    i32.store
    local.get $6
    local.set $3
    local.get $1
    local.set $5
    local.get $7
    local.set $4
    br $while-continue|2
   end
  end
  loop $for-loop|4
   local.get $4
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $1
    local.get $10
    i32.add
    i32.load
    local.tee $3
    i32.const -1
    i32.ne
    if
     local.get $0
     local.get $3
     local.get $1
     local.get $12
     i32.add
     i32.load
     i32.const 1
     i32.add
     local.get $9
     local.get $11
     local.get $2
     call $~lib/util/sort/mergeRuns<i32>
    end
    local.get $4
    i32.const 1
    i32.sub
    local.set $4
    br $for-loop|4
   end
  end
  global.get $~lib/rt/stub/offset
  local.get $11
  local.get $11
  i32.const 4
  i32.sub
  local.tee $0
  i32.load
  i32.add
  i32.eq
  if
   local.get $0
   global.set $~lib/rt/stub/offset
  end
  global.get $~lib/rt/stub/offset
  local.get $10
  local.get $10
  i32.const 4
  i32.sub
  local.tee $0
  i32.load
  i32.add
  i32.eq
  if
   local.get $0
   global.set $~lib/rt/stub/offset
  end
 )
 (func $~lib/array/Array<i32>#slice@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   i32.const 2147483647
   local.set $1
  end
  local.get $0
  i32.load offset=12
  local.tee $3
  i32.const 0
  local.get $3
  i32.const 0
  i32.le_s
  select
  local.set $2
  local.get $1
  local.get $3
  local.get $1
  local.get $3
  i32.lt_s
  select
  local.get $2
  i32.sub
  local.tee $1
  i32.const 0
  local.get $1
  i32.const 0
  i32.gt_s
  select
  local.tee $1
  i32.const 2
  i32.const 8
  i32.const 0
  call $~lib/rt/__newArray
  local.tee $3
  i32.load offset=4
  local.get $0
  i32.load offset=4
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.const 2
  i32.shl
  memory.copy
  local.get $3
 )
 (func $assembly/types/PokerTypes/EvaluatedHand#constructor (result i32)
  (local $0 i32)
  i32.const 20
  i32.const 24
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 1
  i32.store
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 23
  i32.const 10864
  call $~lib/rt/__newArray
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 100
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 8
  i32.const 10896
  call $~lib/rt/__newArray
  i32.store offset=16
  local.get $0
 )
 (func $assembly/poker/handEvaluator/evaluateFiveCardHand (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  local.get $0
  i32.load offset=12
  drop
  local.get $0
  call $assembly/poker/handEvaluator/sortByValueDesc
  local.set $7
  i32.const 0
  i32.const 2
  i32.const 8
  i32.const 10640
  call $~lib/rt/__newArray
  local.set $10
  loop $for-loop|0
   local.get $2
   local.get $7
   i32.load offset=12
   i32.lt_s
   if
    local.get $10
    local.get $7
    local.get $2
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  i32.const 1
  local.set $12
  local.get $0
  i32.const 0
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load
  local.set $1
  i32.const 1
  local.set $2
  loop $for-loop|1
   local.get $2
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    block $for-break1
     local.get $1
     local.get $0
     local.get $2
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.load
     i32.ne
     if
      i32.const 0
      local.set $12
      br $for-break1
     end
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|1
    end
   end
  end
  i32.const 1
  local.set $1
  i32.const 1
  local.set $2
  loop $for-loop|2
   local.get $2
   local.get $10
   i32.load offset=12
   i32.lt_s
   if
    block $for-break2
     local.get $10
     local.get $2
     i32.const 1
     i32.sub
     call $~lib/array/Array<i32>#__get
     local.get $10
     local.get $2
     call $~lib/array/Array<i32>#__get
     i32.sub
     i32.const 1
     i32.ne
     if
      i32.const 0
      local.set $1
      br $for-break2
     end
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|2
    end
   end
  end
  local.get $10
  i32.const 0
  call $~lib/array/Array<i32>#__get
  i32.const 14
  i32.eq
  local.tee $2
  if
   local.get $10
   i32.const 1
   call $~lib/array/Array<i32>#__get
   i32.const 5
   i32.eq
   local.set $2
  end
  local.get $2
  if
   local.get $10
   i32.const 2
   call $~lib/array/Array<i32>#__get
   i32.const 4
   i32.eq
   local.set $2
  end
  local.get $2
  if
   local.get $10
   i32.const 3
   call $~lib/array/Array<i32>#__get
   i32.const 3
   i32.eq
   local.set $2
  end
  local.get $1
  local.get $2
  if (result i32)
   local.get $10
   i32.const 4
   call $~lib/array/Array<i32>#__get
   i32.const 2
   i32.eq
  else
   local.get $2
  end
  local.tee $3
  local.get $1
  select
  local.set $6
  call $"~lib/map/Map<i32,i32>#constructor"
  local.set $11
  i32.const 0
  local.set $1
  loop $for-loop|3
   local.get $1
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    local.get $0
    local.get $1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    local.set $4
    local.get $11
    i32.load
    local.get $11
    i32.load offset=4
    local.get $4
    i32.const -1028477379
    i32.mul
    i32.const 374761397
    i32.add
    i32.const 17
    i32.rotl
    i32.const 668265263
    i32.mul
    local.tee $2
    local.get $2
    i32.const 15
    i32.shr_u
    i32.xor
    i32.const -2048144777
    i32.mul
    local.tee $2
    local.get $2
    i32.const 13
    i32.shr_u
    i32.xor
    i32.const -1028477379
    i32.mul
    local.tee $2
    local.get $2
    i32.const 16
    i32.shr_u
    i32.xor
    i32.and
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.set $5
    block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
     loop $while-continue|0
      local.get $5
      if
       local.get $5
       i32.load offset=8
       local.tee $2
       i32.const 1
       i32.and
       if (result i32)
        i32.const 0
       else
        local.get $5
        i32.load
        local.get $4
        i32.eq
       end
       br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$1365"
       local.get $2
       i32.const -2
       i32.and
       local.set $5
       br $while-continue|0
      end
     end
     i32.const 0
     local.set $5
    end
    local.get $11
    local.get $4
    local.get $5
    if (result i32)
     local.get $11
     local.get $4
     call $"~lib/map/Map<i32,i32>#get"
    else
     i32.const 0
    end
    i32.const 1
    i32.add
    call $"~lib/map/Map<i32,i32>#set"
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|3
   end
  end
  local.get $11
  i32.load offset=8
  local.set $5
  local.get $11
  i32.load offset=16
  local.tee $4
  call $~lib/array/Array<i32>#constructor
  local.set $2
  i32.const 0
  local.set $1
  loop $for-loop|04
   local.get $4
   local.get $9
   i32.gt_s
   if
    local.get $5
    local.get $9
    i32.const 12
    i32.mul
    i32.add
    local.tee $8
    i32.load offset=8
    i32.const 1
    i32.and
    i32.eqz
    if
     local.get $2
     local.get $1
     local.get $8
     i32.load offset=4
     call $~lib/array/Array<u32>#__set
     local.get $1
     i32.const 1
     i32.add
     local.set $1
    end
    local.get $9
    i32.const 1
    i32.add
    local.set $9
    br $for-loop|04
   end
  end
  local.get $2
  local.get $1
  i32.const 2
  i32.const 0
  call $~lib/array/ensureCapacity
  local.get $2
  local.get $1
  i32.store offset=12
  i32.const 0
  i32.const 2
  i32.const 8
  i32.const 10672
  call $~lib/rt/__newArray
  local.set $1
  loop $for-loop|4
   local.get $13
   local.get $2
   i32.load offset=12
   i32.lt_s
   if
    local.get $1
    local.get $2
    local.get $13
    call $~lib/array/Array<i32>#__get
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $13
    i32.const 1
    i32.add
    local.set $13
    br $for-loop|4
   end
  end
  local.get $1
  i32.load offset=4
  local.get $1
  i32.load offset=12
  i32.const 10704
  call $~lib/util/sort/SORT<i32>
  local.get $6
  i32.const 0
  local.get $12
  select
  if (result i32)
   local.get $10
   i32.const 0
   call $~lib/array/Array<i32>#__get
   i32.const 14
   i32.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $10
   i32.const 4
   call $~lib/array/Array<i32>#__get
   i32.const 10
   i32.eq
  else
   i32.const 0
  end
  if (result i32)
   i32.const 10
  else
   local.get $6
   i32.const 0
   local.get $12
   select
   if (result i32)
    i32.const 9
   else
    local.get $1
    i32.const 0
    call $~lib/array/Array<i32>#__get
    i32.const 4
    i32.eq
    if (result i32)
     i32.const 8
    else
     local.get $1
     i32.const 0
     call $~lib/array/Array<i32>#__get
     i32.const 3
     i32.eq
     if (result i32)
      local.get $1
      i32.const 1
      call $~lib/array/Array<i32>#__get
      i32.const 2
      i32.eq
     else
      i32.const 0
     end
     if (result i32)
      i32.const 7
     else
      local.get $12
      if (result i32)
       i32.const 6
      else
       local.get $6
       if (result i32)
        i32.const 5
       else
        local.get $1
        i32.const 0
        call $~lib/array/Array<i32>#__get
        i32.const 3
        i32.eq
        if (result i32)
         i32.const 4
        else
         local.get $1
         i32.const 0
         call $~lib/array/Array<i32>#__get
         i32.const 2
         i32.eq
         if (result i32)
          local.get $1
          i32.load offset=12
          i32.const 2
          i32.ge_s
         else
          i32.const 0
         end
         if (result i32)
          local.get $1
          i32.const 1
          call $~lib/array/Array<i32>#__get
          i32.const 2
          i32.eq
         else
          i32.const 0
         end
         if (result i32)
          i32.const 3
         else
          i32.const 2
          i32.const 1
          local.get $1
          i32.const 0
          call $~lib/array/Array<i32>#__get
          i32.const 2
          i32.eq
          select
         end
        end
       end
      end
     end
    end
   end
  end
  local.set $9
  i32.const 5
  local.get $7
  i32.const 0
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load offset=4
  local.get $3
  select
  local.set $8
  i32.const 0
  i32.const 2
  i32.const 27
  i32.const 10736
  call $~lib/rt/__newArray
  local.set $7
  local.get $11
  i32.load offset=8
  local.set $6
  local.get $11
  i32.load offset=16
  local.tee $4
  call $~lib/array/Array<i32>#constructor
  local.set $5
  i32.const 0
  local.set $1
  i32.const 0
  local.set $12
  loop $for-loop|07
   local.get $4
   local.get $12
   i32.gt_s
   if
    local.get $6
    local.get $12
    i32.const 12
    i32.mul
    i32.add
    local.tee $2
    i32.load offset=8
    i32.const 1
    i32.and
    i32.eqz
    if
     local.get $5
     local.get $1
     local.get $2
     i32.load
     call $~lib/array/Array<u32>#__set
     local.get $1
     i32.const 1
     i32.add
     local.set $1
    end
    local.get $12
    i32.const 1
    i32.add
    local.set $12
    br $for-loop|07
   end
  end
  local.get $5
  local.get $1
  i32.const 2
  i32.const 0
  call $~lib/array/ensureCapacity
  local.get $5
  local.get $1
  i32.store offset=12
  i32.const 0
  local.set $1
  loop $for-loop|5
   local.get $1
   local.get $5
   i32.load offset=12
   i32.lt_s
   if
    local.get $5
    local.get $1
    call $~lib/array/Array<i32>#__get
    local.set $4
    i32.const 2
    i32.const 2
    i32.const 8
    i32.const 0
    call $~lib/rt/__newArray
    local.tee $2
    i32.const 0
    local.get $4
    call $~lib/array/Array<u32>#__set
    local.get $2
    i32.const 1
    local.get $11
    local.get $4
    call $"~lib/map/Map<i32,i32>#get"
    call $~lib/array/Array<u32>#__set
    local.get $7
    local.get $2
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|5
   end
  end
  i32.const 0
  local.set $1
  loop $for-loop|6
   local.get $1
   local.get $7
   i32.load offset=12
   i32.lt_s
   if
    local.get $1
    i32.const 1
    i32.add
    local.set $13
    loop $for-loop|7
     local.get $13
     local.get $7
     i32.load offset=12
     i32.lt_s
     if
      local.get $7
      local.get $13
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.const 1
      call $~lib/array/Array<i32>#__get
      local.get $7
      local.get $1
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.const 1
      call $~lib/array/Array<i32>#__get
      i32.gt_s
      if (result i32)
       i32.const 1
      else
       local.get $7
       local.get $13
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       i32.const 1
       call $~lib/array/Array<i32>#__get
       local.get $7
       local.get $1
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       i32.const 1
       call $~lib/array/Array<i32>#__get
       i32.eq
       if (result i32)
        local.get $7
        local.get $13
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.const 0
        call $~lib/array/Array<i32>#__get
        local.get $7
        local.get $1
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.const 0
        call $~lib/array/Array<i32>#__get
        i32.gt_s
       else
        i32.const 0
       end
      end
      if
       local.get $7
       local.get $1
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $2
       local.get $7
       local.get $1
       local.get $7
       local.get $13
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       call $~lib/array/Array<u32>#__set
       local.get $7
       local.get $13
       local.get $2
       call $~lib/array/Array<u32>#__set
      end
      local.get $13
      i32.const 1
      i32.add
      local.set $13
      br $for-loop|7
     end
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|6
   end
  end
  i32.const 0
  i32.const 2
  i32.const 8
  i32.const 10768
  call $~lib/rt/__newArray
  drop
  local.get $9
  i32.const 9
  i32.eq
  local.get $9
  i32.const 10
  i32.eq
  i32.or
  if
   i32.const 1
   i32.const 2
   i32.const 8
   i32.const 0
   call $~lib/rt/__newArray
   local.tee $2
   i32.const 0
   local.get $3
   if (result i32)
    i32.const 5
   else
    local.get $10
    i32.const 0
    call $~lib/array/Array<i32>#__get
   end
   call $~lib/array/Array<u32>#__set
  else
   local.get $9
   i32.const 8
   i32.eq
   if
    i32.const 2
    i32.const 2
    i32.const 8
    i32.const 0
    call $~lib/rt/__newArray
    local.tee $2
    i32.const 0
    local.get $7
    i32.const 0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.const 0
    call $~lib/array/Array<i32>#__get
    call $~lib/array/Array<u32>#__set
    local.get $2
    i32.const 1
    local.get $7
    i32.const 1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.const 0
    call $~lib/array/Array<i32>#__get
    call $~lib/array/Array<u32>#__set
   else
    local.get $9
    i32.const 7
    i32.eq
    if
     i32.const 2
     i32.const 2
     i32.const 8
     i32.const 0
     call $~lib/rt/__newArray
     local.tee $2
     i32.const 0
     local.get $7
     i32.const 0
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.const 0
     call $~lib/array/Array<i32>#__get
     call $~lib/array/Array<u32>#__set
     local.get $2
     i32.const 1
     local.get $7
     i32.const 1
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.const 0
     call $~lib/array/Array<i32>#__get
     call $~lib/array/Array<u32>#__set
    else
     local.get $9
     i32.const 6
     i32.eq
     if
      i32.const 1
      global.set $~argumentsLength
      local.get $10
      call $~lib/array/Array<i32>#slice@varargs
      local.set $2
     else
      local.get $9
      i32.const 5
      i32.eq
      if
       i32.const 1
       i32.const 2
       i32.const 8
       i32.const 0
       call $~lib/rt/__newArray
       local.tee $2
       i32.const 0
       local.get $3
       if (result i32)
        i32.const 5
       else
        local.get $10
        i32.const 0
        call $~lib/array/Array<i32>#__get
       end
       call $~lib/array/Array<u32>#__set
      else
       local.get $9
       i32.const 4
       i32.eq
       if
        i32.const 1
        i32.const 2
        i32.const 8
        i32.const 0
        call $~lib/rt/__newArray
        local.tee $2
        i32.const 0
        local.get $7
        i32.const 0
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.const 0
        call $~lib/array/Array<i32>#__get
        call $~lib/array/Array<u32>#__set
        i32.const 1
        local.set $1
        loop $for-loop|8
         local.get $1
         local.get $7
         i32.load offset=12
         i32.lt_s
         if
          local.get $2
          local.get $7
          local.get $1
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.const 0
          call $~lib/array/Array<i32>#__get
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
          local.get $1
          i32.const 1
          i32.add
          local.set $1
          br $for-loop|8
         end
        end
       else
        local.get $9
        i32.const 3
        i32.eq
        if
         i32.const 0
         i32.const 2
         i32.const 8
         i32.const 10800
         call $~lib/rt/__newArray
         local.set $1
         i32.const 0
         local.set $13
         i32.const 0
         local.set $2
         loop $for-loop|9
          local.get $2
          local.get $7
          i32.load offset=12
          i32.lt_s
          if
           local.get $7
           local.get $2
           call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
           i32.const 1
           call $~lib/array/Array<i32>#__get
           i32.const 2
           i32.eq
           if
            local.get $1
            local.get $7
            local.get $2
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            i32.const 0
            call $~lib/array/Array<i32>#__get
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
           else
            local.get $7
            local.get $2
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            i32.const 0
            call $~lib/array/Array<i32>#__get
            local.set $13
           end
           local.get $2
           i32.const 1
           i32.add
           local.set $2
           br $for-loop|9
          end
         end
         local.get $1
         i32.load offset=4
         local.get $1
         i32.load offset=12
         i32.const 10832
         call $~lib/util/sort/SORT<i32>
         i32.const 3
         i32.const 2
         i32.const 8
         i32.const 0
         call $~lib/rt/__newArray
         local.tee $2
         i32.const 0
         local.get $1
         i32.const 0
         call $~lib/array/Array<i32>#__get
         call $~lib/array/Array<u32>#__set
         local.get $2
         i32.const 1
         local.get $1
         i32.const 1
         call $~lib/array/Array<i32>#__get
         call $~lib/array/Array<u32>#__set
         local.get $2
         i32.const 2
         local.get $13
         call $~lib/array/Array<u32>#__set
        else
         local.get $9
         i32.const 2
         i32.eq
         if
          i32.const 1
          i32.const 2
          i32.const 8
          i32.const 0
          call $~lib/rt/__newArray
          local.tee $2
          i32.const 0
          local.get $7
          i32.const 0
          call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
          i32.const 0
          call $~lib/array/Array<i32>#__get
          call $~lib/array/Array<u32>#__set
          i32.const 1
          local.set $1
          loop $for-loop|10
           local.get $1
           local.get $7
           i32.load offset=12
           i32.lt_s
           if
            local.get $2
            local.get $7
            local.get $1
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            i32.const 0
            call $~lib/array/Array<i32>#__get
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
            local.get $1
            i32.const 1
            i32.add
            local.set $1
            br $for-loop|10
           end
          end
         else
          i32.const 1
          global.set $~argumentsLength
          local.get $10
          call $~lib/array/Array<i32>#slice@varargs
          local.set $2
         end
        end
       end
      end
     end
    end
   end
  end
  call $"~lib/map/Map<i32,i32>#constructor"
  local.set $5
  i32.const 0
  local.set $1
  loop $for-loop|00
   local.get $1
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    local.get $0
    local.get $1
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    local.set $4
    local.get $5
    i32.load
    local.get $5
    i32.load offset=4
    local.get $4
    i32.const -1028477379
    i32.mul
    i32.const 374761397
    i32.add
    i32.const 17
    i32.rotl
    i32.const 668265263
    i32.mul
    local.tee $3
    local.get $3
    i32.const 15
    i32.shr_u
    i32.xor
    i32.const -2048144777
    i32.mul
    local.tee $3
    local.get $3
    i32.const 13
    i32.shr_u
    i32.xor
    i32.const -1028477379
    i32.mul
    local.tee $3
    local.get $3
    i32.const 16
    i32.shr_u
    i32.xor
    i32.and
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.set $13
    block $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13650"
     loop $while-continue|01
      local.get $13
      if
       local.get $13
       i32.load offset=8
       local.tee $3
       i32.const 1
       i32.and
       if (result i32)
        i32.const 0
       else
        local.get $13
        i32.load
        local.get $4
        i32.eq
       end
       br_if $"__inlined_func$~lib/map/Map<i32,assembly/types/GameState/CardDef>#find$13650"
       local.get $3
       i32.const -2
       i32.and
       local.set $13
       br $while-continue|01
      end
     end
     i32.const 0
     local.set $13
    end
    local.get $5
    local.get $4
    local.get $13
    if (result i32)
     local.get $5
     local.get $4
     call $"~lib/map/Map<i32,i32>#get"
    else
     i32.const 0
    end
    i32.const 1
    i32.add
    call $"~lib/map/Map<i32,i32>#set"
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|00
   end
  end
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  call $~lib/array/Array<assembly/types/PokerTypes/PokerCard>#slice@varargs
  local.set $4
  i32.const 0
  local.set $1
  loop $for-loop|15
   local.get $1
   local.get $4
   i32.load offset=12
   i32.lt_s
   if
    local.get $1
    i32.const 1
    i32.add
    local.set $13
    loop $for-loop|27
     local.get $13
     local.get $4
     i32.load offset=12
     i32.lt_s
     if
      local.get $5
      local.get $4
      local.get $1
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load offset=4
      call $"~lib/map/Map<i32,i32>#get"
      local.tee $3
      local.get $5
      local.get $4
      local.get $13
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
      i32.load offset=4
      call $"~lib/map/Map<i32,i32>#get"
      local.tee $0
      i32.lt_s
      if (result i32)
       i32.const 1
      else
       local.get $0
       local.get $3
       i32.eq
       if (result i32)
        local.get $4
        local.get $13
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.load offset=4
        local.get $4
        local.get $1
        call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
        i32.load offset=4
        i32.gt_s
       else
        i32.const 0
       end
      end
      if
       local.get $4
       local.get $1
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       local.set $0
       local.get $4
       local.get $1
       local.get $4
       local.get $13
       call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
       call $~lib/array/Array<u32>#__set
       local.get $4
       local.get $13
       local.get $0
       call $~lib/array/Array<u32>#__set
      end
      local.get $13
      i32.const 1
      i32.add
      local.set $13
      br $for-loop|27
     end
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|15
   end
  end
  call $assembly/types/PokerTypes/EvaluatedHand#constructor
  local.tee $0
  local.get $9
  i32.store
  local.get $0
  local.get $4
  i32.store offset=4
  local.get $0
  local.get $8
  i32.store offset=8
  local.get $0
  local.get $9
  i32.const 0
  i32.ne
  local.get $9
  i32.const 10
  i32.le_u
  i32.and
  if (result i32)
   i32.const 1360
   local.get $9
   call $~lib/array/Array<i32>#__get
  else
   i32.const 100
  end
  i32.store offset=12
  local.get $0
  local.get $2
  i32.store offset=16
  local.get $0
 )
 (func $assembly/poker/handEvaluator/findBestHand (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  i32.const 0
  i32.const 2
  i32.const 23
  i32.const 10928
  call $~lib/rt/__newArray
  local.set $8
  loop $for-loop|0
   local.get $3
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    local.get $8
    local.get $0
    local.get $3
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|0
   end
  end
  i32.const 0
  local.set $0
  loop $for-loop|1
   local.get $0
   local.get $1
   i32.load offset=12
   i32.lt_s
   if
    local.get $8
    local.get $1
    local.get $0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|1
   end
  end
  local.get $8
  i32.load offset=12
  i32.const 5
  i32.lt_s
  if
   local.get $8
   call $assembly/poker/handEvaluator/sortByValueDesc
   local.set $0
   call $assembly/types/PokerTypes/EvaluatedHand#constructor
   local.tee $1
   i32.const 1
   i32.store
   local.get $1
   local.get $0
   i32.store offset=4
   local.get $1
   local.get $0
   i32.load offset=12
   i32.const 0
   i32.gt_s
   if (result i32)
    local.get $0
    i32.const 0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
   else
    i32.const 0
   end
   i32.store offset=8
   local.get $1
   i32.const 100
   i32.store offset=12
   i32.const 0
   i32.const 2
   i32.const 8
   i32.const 10960
   call $~lib/rt/__newArray
   local.set $3
   loop $for-loop|2
    local.get $2
    local.get $0
    i32.load offset=12
    i32.lt_s
    if
     local.get $3
     local.get $0
     local.get $2
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
     i32.load offset=4
     call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|2
    end
   end
   local.get $1
   local.get $3
   i32.store offset=16
   local.get $1
   return
  end
  i32.const 0
  local.set $0
  loop $for-loop|3
   local.get $6
   local.get $8
   i32.load offset=12
   i32.const 4
   i32.sub
   i32.lt_s
   if
    local.get $6
    i32.const 1
    i32.add
    local.set $2
    loop $for-loop|4
     local.get $2
     local.get $8
     i32.load offset=12
     i32.const 3
     i32.sub
     i32.lt_s
     if
      local.get $2
      i32.const 1
      i32.add
      local.set $4
      loop $for-loop|5
       local.get $4
       local.get $8
       i32.load offset=12
       i32.const 2
       i32.sub
       i32.lt_s
       if
        local.get $4
        i32.const 1
        i32.add
        local.set $5
        loop $for-loop|6
         local.get $5
         local.get $8
         i32.load offset=12
         i32.const 1
         i32.sub
         i32.lt_s
         if
          local.get $5
          i32.const 1
          i32.add
          local.set $7
          loop $for-loop|7
           local.get $7
           local.get $8
           i32.load offset=12
           i32.lt_s
           if
            i32.const 5
            i32.const 2
            i32.const 23
            i32.const 0
            call $~lib/rt/__newArray
            local.tee $1
            i32.const 0
            local.get $8
            local.get $6
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            call $~lib/array/Array<u32>#__set
            local.get $1
            i32.const 1
            local.get $8
            local.get $2
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            call $~lib/array/Array<u32>#__set
            local.get $1
            i32.const 2
            local.get $8
            local.get $4
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            call $~lib/array/Array<u32>#__set
            local.get $1
            i32.const 3
            local.get $8
            local.get $5
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            call $~lib/array/Array<u32>#__set
            local.get $1
            i32.const 4
            local.get $8
            local.get $7
            call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
            call $~lib/array/Array<u32>#__set
            local.get $1
            call $assembly/poker/handEvaluator/evaluateFiveCardHand
            local.set $1
            local.get $0
            if (result i32)
             local.get $1
             local.get $0
             block $__inlined_func$assembly/poker/handEvaluator/compareHandsInternal$1604 (result i32)
              local.get $1
              i32.load
              local.tee $3
              local.get $0
              i32.load
              local.tee $9
              i32.ne
              if
               local.get $3
               local.get $9
               i32.sub
               br $__inlined_func$assembly/poker/handEvaluator/compareHandsInternal$1604
              end
              local.get $1
              i32.load
              i32.const 5
              i32.eq
              if (result i32)
               i32.const 1
              else
               local.get $1
               i32.load
               i32.const 9
               i32.eq
              end
              if
               local.get $1
               i32.load offset=8
               local.get $0
               i32.load offset=8
               i32.sub
               br $__inlined_func$assembly/poker/handEvaluator/compareHandsInternal$1604
              end
              local.get $1
              i32.load offset=4
              local.tee $1
              local.get $0
              i32.load offset=4
              local.tee $0
              local.get $1
              i32.load offset=12
              local.get $0
              i32.load offset=12
              i32.lt_s
              select
              i32.load offset=12
              local.set $9
              i32.const 0
              local.set $3
              loop $for-loop|013
               local.get $3
               local.get $9
               i32.lt_s
               if
                local.get $1
                local.get $3
                call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                i32.load offset=4
                local.get $0
                local.get $3
                call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                i32.load offset=4
                i32.ne
                if
                 local.get $1
                 local.get $3
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 i32.load offset=4
                 local.get $0
                 local.get $3
                 call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
                 i32.load offset=4
                 i32.sub
                 br $__inlined_func$assembly/poker/handEvaluator/compareHandsInternal$1604
                end
                local.get $3
                i32.const 1
                i32.add
                local.set $3
                br $for-loop|013
               end
              end
              i32.const 0
             end
             i32.const 0
             i32.gt_s
             select
            else
             local.get $1
            end
            local.set $0
            local.get $7
            i32.const 1
            i32.add
            local.set $7
            br $for-loop|7
           end
          end
          local.get $5
          i32.const 1
          i32.add
          local.set $5
          br $for-loop|6
         end
        end
        local.get $4
        i32.const 1
        i32.add
        local.set $4
        br $for-loop|5
       end
      end
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      br $for-loop|4
     end
    end
    local.get $6
    i32.const 1
    i32.add
    local.set $6
    br $for-loop|3
   end
  end
  local.get $0
 )
 (func $assembly/poker/handEvaluator/compareHands (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.load
  local.get $1
  i32.load
  i32.gt_s
  if
   i32.const 1
   return
  end
  local.get $0
  i32.load
  local.get $1
  i32.load
  i32.lt_s
  if
   i32.const -1
   return
  end
  local.get $0
  i32.load
  i32.const 5
  i32.eq
  if (result i32)
   i32.const 1
  else
   local.get $0
   i32.load
   i32.const 9
   i32.eq
  end
  if
   local.get $0
   i32.load offset=8
   local.get $1
   i32.load offset=8
   i32.gt_s
   if
    i32.const 1
    return
   end
   local.get $0
   i32.load offset=8
   local.get $1
   i32.load offset=8
   i32.lt_s
   if
    i32.const -1
    return
   end
   i32.const 0
   return
  end
  local.get $0
  i32.load offset=4
  local.tee $2
  local.get $1
  i32.load offset=4
  local.tee $1
  local.get $2
  i32.load offset=12
  local.get $1
  i32.load offset=12
  i32.lt_s
  select
  i32.load offset=12
  local.set $3
  i32.const 0
  local.set $0
  loop $for-loop|0
   local.get $0
   local.get $3
   i32.lt_s
   if
    local.get $2
    local.get $0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    local.get $1
    local.get $0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    i32.gt_s
    if
     i32.const 1
     return
    end
    local.get $2
    local.get $0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    local.get $1
    local.get $0
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    i32.load offset=4
    i32.lt_s
    if
     i32.const -1
     return
    end
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|0
   end
  end
  i32.const 0
 )
 (func $assembly/poker/handEvaluator/calculateHandStrength (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.load offset=12
  i32.const 2
  i32.lt_s
  if
   i32.const 0
   return
  end
  i32.const 0
  i32.const 2
  i32.const 23
  i32.const 10992
  call $~lib/rt/__newArray
  local.set $4
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.load offset=12
   i32.lt_s
   if
    local.get $4
    local.get $0
    local.get $2
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $1
   i32.load offset=12
   i32.lt_s
   if
    local.get $4
    local.get $1
    local.get $3
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
    call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|1
   end
  end
  local.get $4
  i32.load offset=12
  i32.const 5
  i32.ge_s
  if
   local.get $0
   local.get $1
   call $assembly/poker/handEvaluator/findBestHand
   local.set $0
   i32.const 11
   i32.const 2
   i32.const 8
   i32.const 11024
   call $~lib/rt/__newArray
   local.set $1
   i32.const 100
   local.get $0
   i32.load
   local.tee $2
   i32.const 0
   i32.gt_s
   if (result i32)
    local.get $2
    i32.const 10
    i32.le_s
   else
    i32.const 0
   end
   if (result i32)
    local.get $1
    local.get $0
    i32.load
    call $~lib/array/Array<i32>#__get
   else
    i32.const 10
   end
   local.get $0
   i32.load offset=8
   i32.const 2
   i32.sub
   i32.const 5
   i32.mul
   i32.const 12
   i32.div_s
   i32.add
   local.tee $0
   local.get $0
   i32.const 100
   i32.gt_s
   select
   return
  end
  local.get $0
  i32.const 0
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load offset=4
  local.tee $2
  local.get $0
  i32.const 1
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load offset=4
  local.tee $3
  local.get $2
  local.get $3
  i32.gt_s
  select
  i32.const 2
  i32.sub
  i32.const 30
  i32.mul
  i32.const 12
  i32.div_s
  local.set $1
  local.get $2
  local.get $3
  i32.eq
  if
   local.get $1
   local.get $2
   i32.const 20
   i32.mul
   i32.const 14
   i32.div_s
   i32.const 40
   i32.add
   i32.add
   local.set $1
  end
  local.get $1
  i32.const 12
  i32.add
  local.get $1
  local.get $0
  i32.const 0
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load
  local.get $0
  i32.const 1
  call $~lib/array/Array<assembly/types/GameState/CardInstance>#__get
  i32.load
  i32.eq
  select
  local.set $1
  local.get $2
  local.get $3
  i32.sub
  local.tee $0
  i32.const 0
  i32.lt_s
  if
   i32.const 0
   local.get $0
   i32.sub
   local.set $0
  end
  i32.const 100
  local.get $0
  i32.const 1
  i32.eq
  if (result i32)
   local.get $1
   i32.const 10
   i32.add
  else
   local.get $0
   i32.const 2
   i32.eq
   if (result i32)
    local.get $1
    i32.const 6
    i32.add
   else
    local.get $1
    i32.const 3
    i32.add
    local.get $1
    local.get $0
    i32.const 3
    i32.eq
    select
   end
  end
  local.tee $0
  local.get $0
  i32.const 100
  i32.gt_s
  select
 )
 (func $assembly/types/PokerTypes/BettingState#constructor (result i32)
  (local $0 i32)
  i32.const 23
  i32.const 28
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store8 offset=20
  local.get $0
  i32.const 0
  i32.store8 offset=21
  local.get $0
  i32.const 0
  i32.store8 offset=22
  local.get $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.const 5
  i32.store offset=12
  local.get $0
  i32.const -1
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store8 offset=20
  local.get $0
  i32.const 0
  i32.store8 offset=21
  local.get $0
  i32.const 0
  i32.store8 offset=22
  local.get $0
 )
 (func $assembly/poker/bettingEngine/calculateCallAmount (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  if (result i32)
   local.get $0
   i32.load offset=8
   local.tee $1
   local.get $0
   i32.load offset=4
   local.tee $0
   i32.gt_s
   if (result i32)
    local.get $1
    local.get $0
    i32.sub
   else
    i32.const 0
   end
  else
   local.get $0
   i32.load offset=4
   local.tee $1
   local.get $0
   i32.load offset=8
   local.tee $0
   i32.gt_s
   if (result i32)
    local.get $1
    local.get $0
    i32.sub
   else
    i32.const 0
   end
  end
 )
 (func $assembly/poker/bettingEngine/processBettingAction (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (result i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  call $assembly/types/PokerTypes/BettingState#constructor
  local.tee $5
  local.get $0
  i32.load
  i32.store
  local.get $5
  local.get $0
  i32.load offset=4
  i32.store offset=4
  local.get $5
  local.get $0
  i32.load offset=8
  i32.store offset=8
  local.get $5
  local.get $0
  i32.load offset=12
  i32.store offset=12
  local.get $5
  local.get $0
  i32.load offset=16
  i32.store offset=16
  local.get $5
  local.get $0
  i32.load8_u offset=20
  i32.store8 offset=20
  local.get $5
  local.get $0
  i32.load8_u offset=21
  i32.store8 offset=21
  local.get $5
  local.get $0
  i32.load8_u offset=22
  i32.store8 offset=22
  i32.const 12
  i32.const 29
  call $~lib/rt/stub/__new
  local.tee $6
  i32.const 0
  i32.store
  local.get $6
  i32.const 0
  i32.store8 offset=4
  local.get $6
  i32.const 0
  i32.store offset=8
  local.get $6
  local.get $5
  i32.store
  local.get $6
  i32.const 0
  i32.store8 offset=4
  local.get $6
  i32.const -1
  i32.store offset=8
  local.get $1
  i32.eqz
  local.set $7
  local.get $2
  i32.const 3
  i32.eq
  if
   local.get $6
   local.get $7
   i32.store offset=8
   local.get $5
   i32.const 1
   i32.store8 offset=20
   local.get $6
   i32.const 1
   i32.store8 offset=4
   local.get $6
   return
  end
  local.get $2
  i32.const 4
  i32.eq
  if
   local.get $7
   if (result i32)
    local.get $0
    i32.load offset=8
    local.tee $2
    local.get $0
    i32.load offset=4
    local.tee $3
    i32.sub
    i32.const 0
    local.get $2
    local.get $3
    i32.gt_s
    select
   else
    local.get $0
    i32.load offset=4
    local.tee $2
    local.get $0
    i32.load offset=8
    local.tee $3
    i32.sub
    i32.const 0
    local.get $2
    local.get $3
    i32.gt_s
    select
   end
   i32.const 0
   i32.gt_s
   if
    local.get $0
    local.get $1
    i32.const 2
    i32.const 0
    local.get $4
    call $assembly/poker/bettingEngine/processBettingAction
    return
   end
   local.get $7
   if
    local.get $5
    i32.const 1
    i32.store8 offset=21
   else
    local.get $5
    i32.const 1
    i32.store8 offset=22
   end
   local.get $5
   i32.load8_u offset=21
   if (result i32)
    local.get $5
    i32.load8_u offset=22
   else
    i32.const 0
   end
   if (result i32)
    local.get $5
    i32.load offset=4
    local.get $5
    i32.load offset=8
    i32.eq
   else
    i32.const 0
   end
   if
    local.get $5
    i32.const 1
    i32.store8 offset=20
    local.get $6
    i32.const 1
    i32.store8 offset=4
   end
   local.get $6
   return
  end
  local.get $2
  i32.const 2
  i32.eq
  if
   local.get $7
   if (result i32)
    local.get $0
    i32.load offset=8
    local.tee $1
    local.get $0
    i32.load offset=4
    local.tee $0
    i32.sub
    i32.const 0
    local.get $0
    local.get $1
    i32.lt_s
    select
   else
    local.get $0
    i32.load offset=4
    local.tee $1
    local.get $0
    i32.load offset=8
    local.tee $0
    i32.sub
    i32.const 0
    local.get $0
    local.get $1
    i32.lt_s
    select
   end
   local.set $0
   local.get $7
   if
    local.get $5
    local.get $0
    local.get $5
    i32.load offset=4
    i32.add
    i32.store offset=4
   else
    local.get $5
    local.get $0
    local.get $5
    i32.load offset=8
    i32.add
    i32.store offset=8
   end
   local.get $5
   local.get $0
   local.get $5
   i32.load
   i32.add
   i32.store
   local.get $7
   if
    local.get $5
    i32.const 1
    i32.store8 offset=21
   else
    local.get $5
    i32.const 1
    i32.store8 offset=22
   end
   local.get $5
   i32.load offset=4
   local.get $5
   i32.load offset=8
   i32.eq
   if (result i32)
    local.get $5
    i32.load8_u offset=21
   else
    i32.const 0
   end
   if (result i32)
    local.get $5
    i32.load8_u offset=22
   else
    i32.const 0
   end
   if
    local.get $5
    i32.const 1
    i32.store8 offset=20
    local.get $6
    i32.const 1
    i32.store8 offset=4
   end
   local.get $6
   return
  end
  local.get $2
  i32.eqz
  local.get $2
  i32.const 1
  i32.eq
  i32.or
  if
   local.get $7
   if (result i32)
    local.get $0
    i32.load offset=4
   else
    local.get $0
    i32.load offset=8
   end
   local.tee $2
   local.get $3
   i32.ge_s
   if
    local.get $2
    local.get $0
    i32.load offset=12
    i32.add
    local.set $3
   end
   local.get $3
   local.get $2
   i32.sub
   local.tee $0
   local.get $4
   i32.le_s
   if
    local.get $7
    if
     local.get $5
     local.get $3
     i32.store offset=4
    else
     local.get $5
     local.get $3
     i32.store offset=8
    end
    local.get $5
    local.get $0
    local.get $5
    i32.load
    i32.add
    i32.store
   else
    local.get $7
    if
     local.get $5
     local.get $4
     local.get $5
     i32.load offset=4
     i32.add
     i32.store offset=4
    else
     local.get $5
     local.get $4
     local.get $5
     i32.load offset=8
     i32.add
     i32.store offset=8
    end
    local.get $5
    local.get $4
    local.get $5
    i32.load
    i32.add
    i32.store
   end
   local.get $5
   local.get $1
   i32.store offset=16
   local.get $7
   if
    local.get $5
    i32.const 1
    i32.store8 offset=21
    local.get $5
    i32.const 0
    i32.store8 offset=22
   else
    local.get $5
    i32.const 1
    i32.store8 offset=22
    local.get $5
    i32.const 0
    i32.store8 offset=21
   end
   local.get $6
   return
  end
  local.get $6
 )
 (func $assembly/poker/bettingEngine/initializeBettingState (result i32)
  (local $0 i32)
  call $assembly/types/PokerTypes/BettingState#constructor
  local.tee $0
  i32.const 16
  i32.store
  local.get $0
  i32.const 5
  i32.store offset=4
  local.get $0
  i32.const 10
  i32.store offset=8
  local.get $0
  i32.const 10
  i32.store offset=12
  local.get $0
  i32.const -1
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store8 offset=20
  local.get $0
  i32.const 0
  i32.store8 offset=21
  local.get $0
  i32.const 0
  i32.store8 offset=22
  local.get $0
 )
 (func $assembly/poker/bettingEngine/resetForNewRound (param $0 i32) (result i32)
  (local $1 i32)
  call $assembly/types/PokerTypes/BettingState#constructor
  local.tee $1
  local.get $0
  i32.load
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 10
  i32.store offset=12
  local.get $1
  i32.const -1
  i32.store offset=16
  local.get $1
  i32.const 0
  i32.store8 offset=20
  local.get $1
  i32.const 0
  i32.store8 offset=21
  local.get $1
  i32.const 0
  i32.store8 offset=22
  local.get $1
 )
 (func $assembly/poker/bettingEngine/calculateMinRaise (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.load offset=4
  local.tee $1
  local.get $0
  i32.load offset=8
  i32.gt_s
  if (result i32)
   local.get $1
  else
   local.get $0
   i32.load offset=8
  end
  local.get $0
  i32.load offset=12
  i32.add
 )
 (func $assembly/poker/phaseManager/getNextPhase (param $0 i32) (result i32)
  (local $1 i32)
  loop $for-loop|0
   local.get $1
   i32.const 1484
   i32.load
   i32.const 1
   i32.sub
   i32.lt_s
   if
    i32.const 1472
    local.get $1
    call $~lib/array/Array<i32>#__get
    local.get $0
    i32.eq
    if
     i32.const 1472
     local.get $1
     i32.const 1
     i32.add
     call $~lib/array/Array<i32>#__get
     return
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  i32.const 7
 )
 (func $assembly/poker/phaseManager/getBettingRound (param $0 i32) (result i32)
  local.get $0
  i32.const 3
  i32.eq
  if
   i32.const 0
   return
  end
  local.get $0
  i32.const 4
  i32.eq
  if
   i32.const 1
   return
  end
  local.get $0
  i32.const 5
  i32.eq
  if
   i32.const 2
   return
  end
  local.get $0
  i32.const 6
  i32.eq
  if
   i32.const 3
   return
  end
  i32.const -1
 )
 (func $assembly/poker/phaseManager/isBettingPhase (param $0 i32) (result i32)
  local.get $0
  i32.const 4
  i32.eq
  local.get $0
  i32.const 3
  i32.eq
  i32.or
  local.get $0
  i32.const 5
  i32.eq
  i32.or
  local.get $0
  i32.const 6
  i32.eq
  i32.or
 )
 (func $assembly/poker/phaseManager/isRevealPhase (param $0 i32) (result i32)
  local.get $0
  i32.const 5
  i32.eq
  local.get $0
  i32.const 4
  i32.eq
  i32.or
  local.get $0
  i32.const 6
  i32.eq
  i32.or
 )
 (func $assembly/poker/phaseManager/getCommunityCardsToReveal (param $0 i32) (result i32)
  local.get $0
  i32.const 4
  i32.eq
  if
   i32.const 3
   return
  end
  local.get $0
  i32.const 5
  i32.eq
  if
   i32.const 1
   return
  end
  local.get $0
  i32.const 6
  i32.eq
  if
   i32.const 1
   return
  end
  i32.const 0
 )
 (func $assembly/poker/phaseManager/getTotalCommunityCards (param $0 i32) (result i32)
  local.get $0
  i32.const 2
  i32.le_s
  if
   i32.const 0
   return
  end
  local.get $0
  i32.const 3
  i32.eq
  if
   i32.const 0
   return
  end
  local.get $0
  i32.const 4
  i32.eq
  if
   i32.const 3
   return
  end
  local.get $0
  i32.const 5
  i32.eq
  if
   i32.const 4
   return
  end
  i32.const 5
 )
 (func $assembly/types/PokerTypes/calculateFinalDamage@varargs (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  block $1of1
   block $0of1
    block $outOfRange
     global.get $~argumentsLength
     i32.const 3
     i32.sub
     br_table $0of1 $1of1 $outOfRange
    end
    unreachable
   end
   i32.const 0
   local.set $3
  end
  local.get $2
  i32.const 10
  i32.le_s
  local.get $2
  i32.const 0
  i32.gt_s
  i32.and
  if (result i32)
   i32.const 1360
   local.get $2
   call $~lib/array/Array<i32>#__get
  else
   i32.const 100
  end
  local.get $0
  local.get $1
  i32.add
  i32.mul
  i32.const 100
  i32.div_s
  local.get $3
  i32.add
 )
 (func $assembly/types/PokerTypes/createPokerDeck (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 0
  i32.const 2
  i32.const 23
  i32.const 11088
  call $~lib/rt/__newArray
  local.set $3
  loop $for-loop|0
   local.get $2
   i32.const 4
   i32.lt_s
   if
    i32.const 2
    local.set $0
    loop $for-loop|1
     local.get $0
     i32.const 14
     i32.le_s
     if
      i32.const 8
      i32.const 22
      call $~lib/rt/stub/__new
      local.tee $1
      i32.const 0
      i32.store
      local.get $1
      i32.const 0
      i32.store offset=4
      local.get $1
      local.get $2
      i32.store
      local.get $1
      local.get $0
      i32.store offset=4
      local.get $3
      local.get $1
      call $~lib/array/Array<assembly/types/GameState/CardInstance>#push
      local.get $0
      i32.const 1
      i32.add
      local.set $0
      br $for-loop|1
     end
    end
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $3
 )
 (func $~lib/rt/stub/__pin (param $0 i32) (result i32)
  local.get $0
 )
 (func $~lib/rt/stub/__unpin (param $0 i32)
 )
 (func $~setArgumentsLength (param $0 i32)
  local.get $0
  global.set $~argumentsLength
 )
 (func $~start
  (local $0 i32)
  i32.const 11228
  global.set $~lib/rt/stub/offset
  i32.const 24
  i32.const 7
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $0
  i32.const 3
  i32.store offset=4
  local.get $0
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $0
  i32.const 4
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
  local.get $0
  global.set $assembly/util/cardLookup/cardRegistry
 )
)
