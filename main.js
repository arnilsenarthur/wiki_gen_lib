//Import libs
const showdown = require('showdown');
const showdownHighlight = require("showdown-highlight");
const cheerio = require('cheerio')
const fs = require('fs');
const { argv } = require('process');

//Create conversor
const converter = new showdown.Converter({
    emoji: true,
    extensions: [showdownHighlight],
    tasklists: true,
    tables: true,
    strikethrough: true,
    ghMentions: true
});

function createPage(page, template, nav, home, header, footer, returnlink) {
    //External Variables
    let title = page.title;
    let subtitle = page.subtitle;

    let last_change = {
        author: page.last_modified[0],
        date: page.last_modified[1]
    };

    let creation = {
        author: page.created[0],
        date: page.created[1]
    };

    let tags =
        /*[{
               text: "main tag",
               color: "blue"
           }, {
               text: "2 tag",
               color: "red"
           }]*/
        page.tags;


    let path = [{
        text: 'code-braces',
        disabled: true,
        normal: false,
        href: 'breadcrumbs_dashboard',
    }];

    let sp = page.path.split("/");
    for (let i = 0; i < sp.length; i++)
        path.push({
            text: sp[i],
            disabled: true,
            normal: true,
            href: ''
        });

    let version = page.version;

    /////////////////////////////
    let mds = fs.readFileSync("contents/" + page.source, { encoding: 'utf8', flag: 'r' });
    let content = converter.makeHtml(mds);
    let source = JSON.stringify(compressString(mds));
    const $ = cheerio.load(content);

    //Sections info
    let sections = [];

    //Format

    //H1 & H2
    $("h1,h2").each(function(i, elm) {
        sections.push({ text: $(elm).text(), level: $(elm).prop("tagName") == "H1" ? 0 : 1, color: $(elm).prop("tagName") == "H1" ? "black" : "gray", target: $(elm).attr("id") });
    });

    //Code      
    {
        $("code").css("background-color", "transparent");
        $("code").parent().addClass("hljs");
        $("code").parent().addClass("hljspre");
        $("code").addClass("hljscontent");

        //Get language for a code
        $("code").each(function(i, x) {
            let ss = $(x).attr("class").split(/\s+/);
            let language = "";
            for (let i in ss) {
                let s = ss[i];

                if (s.startsWith("language-")) {
                    language = s.substring(9);
                }
            }
        });
    }

    //Blockcode -> Messages
    $("blockquote").each(function(i, elm) {
        let content = $(elm).text().trim();
        let parent = $(elm).parent();

        let type = "info";
        if (content.match(new RegExp("^{.*}.*"))) {
            type = content.substr(1).split("}")[0];
            content = content.substr(content.indexOf("}") + 1);
        }
        let ctt = '<v-alert dense type="' + type + '" text>' + content.replace("\n", "<br>") + '</v-alert>';
        $(elm).replaceWith(ctt);
    });

    //Lists
    $("li").each(function(i, elm) {
        let content = $(elm).html();

        let onclick = "";

        if ($(this).find("a").length > 0) {
            onclick = 'window.location.href = \'' + $(this).find("a").attr("href") + "\'";
            $(elm).replaceWith('<div class="list_item linkholder" onclick="' + onclick + '"><b>' + content + "</b></div");
        } else
            $(elm).addClass("list_item");


        if ($(this).find("input").length > 0) {
            $(this).find("input").replaceWith("<v-checkbox " + ($(this).find("input").prop("checked") ? "input-value=\"true\"" : "") + " value disabled style=\"transform: translate(0px,-4px); float: left;height: 20px;margin-top: 0px; margin-bottom: 0px\"></v-checkbox>");
            $(this).replaceWith("<div class=\"list_item tasks\" style=\"height:30px\">" + $(this).html() + "<br></div>");
        }
    });

    //Table
    $("table").each(function(i, elm) {
        let content = $(elm).html();
        $(elm).replaceWith("<v-simple-table><template v-slot:default>" + content + "</template></v-simple-table>")
    });

    fs.writeFileSync("output/" + page.path.replace("/", "_") + ".html",
        template.replace("$$content$$", $("body").html())
        .replace("$$sections$$", JSON.stringify(sections))
        .replace("$$source$$", source)
        .replace("$$title$$", title)
        .replace("$$subtitle$$", subtitle)
        .replace("$$last_change$$", JSON.stringify(last_change))
        .replace("$$creation$$", JSON.stringify(creation))
        .replace("$$tags$$", JSON.stringify(tags))
        .replace("$$versionlabel$$", version)
        .replace("$$navigation$$", JSON.stringify(nav))
        .replace("$$path$$", JSON.stringify(path))
        .replace("$$home$$", home.replace("/", "_"))
        .replace("$$header$$", header)
        .replace("$$footer$$", footer)
        .replace("$$return$$", returnlink)
    );
}

//Used to compress source code
function compressString(c) {
    var x = 'charCodeAt',
        b, e = {},
        f = c.split(""),
        d = [],
        a = f[0],
        g = 256;
    for (b = 1; b < f.length; b++) c = f[b], null != e[a + c] ? a += c : (d.push(1 < a.length ? e[a] : a[x](0)), e[a + c] = g, g++, a = c);
    d.push(1 < a.length ? e[a] : a[x](0));
    for (b = 0; b < d.length; b++) d[b] = String.fromCharCode(d[b]);
    return d.join("")
}

//Load internal settings, variables, etc...
function loadInternalData() {
    try {
        let content = fs.readFileSync("internal/internal.json", { encoding: 'utf8', flag: 'r' });

        return JSON.parse(content);
    } catch (e) {

    }

    let internal = {
        current_user: "Admin"
    };

    //Save default internal
    saveInternal(internal);
    return internal;
}

function saveInternal(internal) {
    fs.writeFileSync("internal/internal.json", JSON.stringify(internal));
}

/**
  ____    _             _     _               _      ____    ___      ____                
 / ___|  | |_    __ _  | |_  (_)   ___       / \    |  _ \  |_ _|    / ___|   ___   _ __  
 \___ \  | __|  / _` | | __| | |  / __|     / _ \   | |_) |  | |    | |  _   / _ \ | '_ \ 
  ___) | | |_  | (_| | | |_  | | | (__     / ___ \  |  __/   | |    | |_| | |  __/ | | | |
 |____/   \__|  \__,_|  \__| |_|  \___|   /_/   \_\ |_|     |___|    \____|  \___| |_| |_|
                                                                                          
 */

var internal = loadInternalData();

console.log("\n---------------------------------------");
if (process.argv.length < 3) {
    console.log("Static Api Pages Generator v1.0");
    console.log("Current user: " + internal.current_user);
} else {
    if (process.argv[2] == "user") {
        if (process.argv.length > 3) {
            internal.current_user = process.argv[3].split("-").join(" ");
            saveInternal(internal);
            console.log("User changed to: " + internal.current_user);
        } else
            console.log("Use: user <username-name-name>");
    } else if (process.argv[2] == "export") {
        console.log("Stating exportation process..");
        console.log("");

        //Preparing
        {
            //1 - Delete old files
            console.log("1/7 deleting old files...");
            let n = 0;
            fs.readdirSync("output").forEach(file => {
                if (file != "code_styles" && file != "style.css") {
                    fs.unlinkSync("output/" + file);
                    n++;
                }
            });
            console.log("2/7 deleted " + n + " old files...");
            console.log("");
        }

        let main;

        //Main init
        {
            console.log("3/7 loading main.js");
            //2 - Parse main.json
            main = JSON.parse(fs.readFileSync("main.json", { encoding: 'utf8', flag: 'r' }));

            console.log("");
        }

        //Tags
        {
            console.log("4/7 loading tags");
            console.log("");
        }

        let pages = [];
        let nav = [];
        //Create Tree
        {
            console.log("5/7 creating navigation tree");
            for (let i in Object.keys(main.structure)) {
                let k = Object.keys(main.structure)[i];

                //Header
                nav.push({
                    text: k,
                    isheader: true
                });

                let path = "";
                //Iterate pages
                for (let j in Object.keys(main.structure[k])) {
                    let l = Object.keys(main.structure[k])[j];

                    if (l == "path") {
                        path = main.structure[k][l];
                    } else {
                        //Page
                        console.log("- Indexing page '" + k + " > " + l + "'");
                        main.structure[k][l].path = path + "/" + main.structure[k][l].path;
                        main.structure[k][l].title = l;

                        let tags = [];

                        for (let m = 0; m < main.structure[k][l].tags.length; m++)
                            tags.push({
                                text: main.structure[k][l].tags[m],
                                color: main.tags[main.structure[k][l].tags[m]].color
                            });

                        main.structure[k][l].tags = tags;

                        nav.push({
                            text: l,
                            icon: "mdi-" + main.structure[k][l].icon,
                            isheader: false,
                            href: main.structure[k][l].path.replace("/", "_")
                        });

                        pages.push(main.structure[k][l]);
                    }
                }
            }
            console.log("");
        }

        //Generate files
        {
            console.log("6/7 generating HTML files");

            console.log("7/7 loading template.html");
            let template = fs.readFileSync("internal/template.html", { encoding: 'utf8', flag: 'r' });

            for (let i = 0; i < pages.length; i++) {
                console.log("- " + (i + 1) + "/" + pages.length + " " + pages[i].path);
                createPage(pages[i], template, nav, main.home, main.header, main.footer, main.return);
            }

            console.log("");
        }

        console.log("END " + pages.length + " Pages generated at 'output'!");
    } else {
        //Invalid comand and show valid command list    
    }
}
console.log("---------------------------------------\n");


//createPage("main.md", "template.html", "test.html");