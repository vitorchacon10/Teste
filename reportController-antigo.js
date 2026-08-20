import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { Product, Movement, Delivery } from '../config/models.js';

// Formata número como moeda brasileira, sem depender de libs extras
function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return 'R$ ' + numero.toFixed(2).replace('.', ',');
}

export async function exportProductsExcel(req, res) {

  const products = await Product.findAll({
    order: [['name','ASC']]
  });


  const workbook = new ExcelJS.Workbook();

  workbook.creator = "SENAI Zerbini";
  workbook.created = new Date();


  const sheet = workbook.addWorksheet(
    'Estoque SENAI',
    {
      properties:{
        tabColor:{
          argb:'E30613'
        }
      }
    }
  );


  // TÍTULO
  sheet.mergeCells('A1:I1');

  const title = sheet.getCell('A1');

  title.value = "RELATÓRIO DE ESTOQUE - SENAI ZERBINI";

  title.font = {
    bold:true,
    size:16,
    color:{
      argb:'FFFFFF'
    }
  };

  title.alignment={
    horizontal:'center'
  };

  title.fill={
    type:'pattern',
    pattern:'solid',
    fgColor:{
      argb:'E30613'
    }
  };


  sheet.addRow([]);


  // CABEÇALHO
  const header = sheet.addRow([
    'Produto',
    'Marca',
    'Quantidade',
    'Preço Unitário',
    'Valor Total',
    'Validade',
    'Código de Barras',
    'Categoria',
    'Localização'
  ]);


  header.eachCell(cell=>{

    cell.font={
      bold:true,
      color:{
        argb:'FFFFFF'
      }
    };


    cell.fill={
      type:'pattern',
      pattern:'solid',
      fgColor:{
        argb:'333333'
      }
    };


    cell.alignment={
      horizontal:'center'
    };

  });


  let valorTotalEstoque = 0;

  products.forEach((p,index)=>{

    const precoUnitario = Number(p.price) || 0;
    const valorTotalProduto = precoUnitario * (p.quantity || 0);
    valorTotalEstoque += valorTotalProduto;

    const row = sheet.addRow([

      p.name || '-',
      p.brand || '-',
      p.quantity || 0,
      precoUnitario,
      valorTotalProduto,
      p.expirationDate || '-',
      p.barcode || '-',
      p.category || '-',
      p.location || '-'

    ]);

    // formata as colunas de preço como moeda
    row.getCell(4).numFmt = 'R$ #,##0.00';
    row.getCell(5).numFmt = 'R$ #,##0.00';


    // cores alternadas

    if(index % 2 === 0){

      row.eachCell(cell=>{

        cell.fill={
          type:'pattern',
          pattern:'solid',
          fgColor:{
            argb:'F2F2F2'
          }
        };

      });

    }


    // estoque baixo vermelho

    if(p.quantity <= p.minQuantity){

      row.getCell(3).font={
        bold:true,
        color:{
          argb:'FF0000'
        }
      };

    }


  });


  // Linha de total geral do estoque
  sheet.addRow([]);
  const rowTotal = sheet.addRow(['', '', '', '', valorTotalEstoque, '', '', '', '']);
  rowTotal.getCell(4).value = 'VALOR TOTAL DO ESTOQUE:';
  rowTotal.getCell(4).font = { bold: true };
  rowTotal.getCell(4).alignment = { horizontal: 'right' };
  rowTotal.getCell(5).numFmt = 'R$ #,##0.00';
  rowTotal.getCell(5).font = { bold: true, color: { argb: 'E30613' } };



  // bordas

  sheet.eachRow(row=>{

    row.eachCell(cell=>{

      cell.border={

        top:{
          style:'thin',
          color:{
            argb:'CCCCCC'
          }
        },

        bottom:{
          style:'thin',
          color:{
            argb:'CCCCCC'
          }
        },

        left:{
          style:'thin',
          color:{
            argb:'CCCCCC'
          }
        },

        right:{
          style:'thin',
          color:{
            argb:'CCCCCC'
          }
        }

      };

    });

  });



  sheet.columns.forEach(column=>{

    column.width = 20;

  });


  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );


  res.setHeader(
    'Content-Disposition',
    'attachment; filename=estoque-senai.xlsx'
  );


  await workbook.xlsx.write(res);

  res.end();

}





export async function exportProductsPdf(req,res){


  const products = await Product.findAll({
    order:[
      ['name','ASC']
    ]
  });



  const doc = new PDFDocument({
    margin:40
  });



  res.setHeader(
    'Content-Type',
    'application/pdf'
  );


  res.setHeader(
    'Content-Disposition',
    'attachment; filename=estoque-senai.pdf'
  );



  doc.pipe(res);



  // CABEÇALHO

  doc
  .rect(0,0,600,70)
  .fill('#E30613');


  doc
  .fillColor('#FFFFFF')
  .fontSize(20)
  .text(
    'RELATÓRIO DE ESTOQUE',
    40,
    25,
    {
      align:'center'
    }
  );



  doc.moveDown(3);



  doc
  .fillColor('#333333')
  .fontSize(12)
  .text(
    `SENAI Zerbini`
  );


  doc.text(
    `Data de emissão: ${dayjs().format('DD/MM/YYYY')}`
  );


  doc.moveDown();



  // tabela

  let valorTotalEstoque = 0;

  products.forEach((p,index)=>{

    const precoUnitario = Number(p.price) || 0;
    const valorTotalProduto = precoUnitario * (p.quantity || 0);
    valorTotalEstoque += valorTotalProduto;


    const y = doc.y;


    if(index % 2 ===0){

      doc
      .rect(
        40,
        y-5,
        520,
        47
      )
      .fill('#F3F3F3');

    }



    doc
    .fillColor('#000')
    .fontSize(10)
    .text(
      `Produto: ${p.name || '-'}`
    )
    .text(
      `Marca: ${p.brand || '-'}   Quantidade: ${p.quantity}`
    )
    .text(
      `Preço Unitário: ${formatarMoeda(precoUnitario)}   Valor Total: ${formatarMoeda(valorTotalProduto)}`
    )
    .text(
      `Validade: ${p.expirationDate || '-'}   Local: ${p.location || '-'}`
    );


    doc.moveDown();


  });



  doc.moveDown();

  doc
  .fontSize(12)
  .fillColor('#E30613')
  .text(
    `VALOR TOTAL DO ESTOQUE: ${formatarMoeda(valorTotalEstoque)}`,
    {
      align: 'right'
    }
  );


  doc.moveDown();


  doc
  .fontSize(9)
  .fillColor('#777')
  .text(
    'Sistema de Controle de Estoque - SENAI Zerbini',
    {
      align:'center'
    }
  );



  doc.end();

}





export async function reportCritical(req,res){

  const today = dayjs()
    .format('YYYY-MM-DD');


  const limit = dayjs()
    .add(30,'day')
    .format('YYYY-MM-DD');


  const expired =
    await Product.findAll({
      where:{
        expirationDate:{
          [Op.lt]:today
        }
      }
    });



  const expiring =
    await Product.findAll({
      where:{
        expirationDate:{
          [Op.between]:[
            today,
            limit
          ]
        }
      }
    });



  const lowStock =
    (await Product.findAll())
    .filter(
      p=>p.quantity <= p.minQuantity
    );



  res.json({
    expired,
    expiring,
    lowStock
  });

}





export async function movements(req,res){

 const data =
 await Movement.findAll({
   include:[Product],
   order:[
     ['createdAt','DESC']
   ]
 });

 res.json(data);

}





export async function deliveries(req,res){

 const data =
 await Delivery.findAll({
   include:[Product],
   order:[
     ['createdAt','DESC']
   ]
 });

 res.json(data);

}