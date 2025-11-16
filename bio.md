Hi, I'm Jake, and I'm <span class="what-am-i"></span> from <a href="https://maps.app.goo.gl/znExp4xj4njYNqs5A" target="_blank">Salt Lake City, UT</a> currently living in <a href="https://maps.app.goo.gl/MMfmNDXtF19uJNqSA" target="_blank">Brooklyn, NY</a>.
I use code to <a href="https://jakewelch.design" target="_blank">design cool projects</a> and to <a href="https://instagram.com/jake___welch" target="_blank">experiment with new ideas</a>.
In my free time, I love to <a href="https://www.goodreads.com/jakewelch" target="_blank">read</a>, <a href="https://by.jakewel.ch" target="_blank">write</a>, and fall down <a href="https://www.are.na/jake-welch" target="_blank">rabbit holes</a>,
usually related to history and art.
<br><br>
This site is my attempt at <a href="https://www.are.na/jake-welch/web-revolution" target="_blank">reclaiming a corner of the internet</a> as a place to share and connect
in a way that's meaningful and breaks free from <a href="https://www.humanetech.com/youth/the-attention-economy" target="_blank">the exploitative algorithms</a> imposed on us by Big Tech. If you're at all
interested in having your own personal site, I've written a <a href="https://tutorials.jakewel.ch/build-a-website.html" target="_blank">beginner-friendly guide</a> on how to do so for free! 
Feel free to surf around, and if you feel so inclined, leave a note in my <a href="https://ourworldoftext.com/jakewelch" target="_blank">guest book</a>, or shoot me an <a href="mailto:jaketwelch@gmail.com" target="_blank">email</a>.
<br><br>
Thanks for visiting!

<style>
.what-am-i {
display: inline-block;
width: 105px;
text-align: center;
}
</style>

<script>
        // Bio titles
        const words = [
            "a designer",
            "a developer",
            "an artist",
            "a researcher",
            "a listener",
            "a cat owner",
            "a technologist",
            "a ponderer",
            "a daydreamer",
            "a programmer",
        ];
        let index = 0;
        const span = document.querySelector('.what-am-i');
        setInterval(() => {
            span.textContent = words[index];
            index = (index + 1) % words.length;
        }, 500);

        // Set active nav item
        const pathname = window.location.pathname;
        if (pathname === '/' || pathname === '/index.html') {
            document.querySelector('.home').classList.add('active');
        } else if (pathname === '/images.html') {
            document.querySelector('.images').classList.add('active');
        } else if (pathname === '/experiments.html') {
            document.querySelector('.experiments').classList.add('active');
        }
    </script>
